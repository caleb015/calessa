import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forgetInvitationCode, getRememberedInvitationCode, rememberInvitationCode } from '@/lib/invitationCode';
import RsvpEntryPage from '@/components/public/RsvpEntryPage';
import RsvpInvitationView from '@/components/public/RsvpInvitationView';
import GuestPhotoUpload from '@/components/public/GuestPhotoUpload';
import { ApiError, publicApi } from '@/lib/api';

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/public/RsvpForm', () => ({ __esModule: true, default: () => <p>RSVP form</p> }));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    publicApi: { getRsvpByCode: jest.fn(), getSettings: jest.fn(), verifyGalleryCode: jest.fn() },
  };
});
const api = publicApi as unknown as Record<string, jest.Mock>;
const GUEST = { id: 'g1', primaryName: 'Maria Santos', email: null, phone: null, allowedPartySize: 2, plusOneAllowed: false, rsvp: null };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSearchParams = new URLSearchParams();
  api.getSettings.mockResolvedValue(null);
});

describe('invitation code memory', () => {
  it('remembers codes in upper case and forgets only the matching code', () => {
    rememberInvitationCode('  abc123 ');
    expect(getRememberedInvitationCode()).toBe('ABC123');
    forgetInvitationCode('OTHER');
    expect(getRememberedInvitationCode()).toBe('ABC123');
    forgetInvitationCode('abc123');
    expect(getRememberedInvitationCode()).toBe('');
  });

  it('works without storage (e.g. private browsing)', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(getRememberedInvitationCode()).toBe('');
    spy.mockRestore();
  });
});

describe('RSVP page', () => {
  it('fills in the code used before', async () => {
    rememberInvitationCode('ABC123');
    render(<RsvpEntryPage />);
    await waitFor(() => expect(screen.getByLabelText('Invitation code')).toHaveValue('ABC123'));
  });

  it('prefers the code from the link', () => {
    rememberInvitationCode('ABC123');
    render(<RsvpEntryPage initialCode="LINK9999" />);
    expect(screen.getByLabelText('Invitation code')).toHaveValue('LINK9999');
  });

  it('remembers a code once it finds the invitation', async () => {
    jest.useFakeTimers();
    api.getRsvpByCode.mockResolvedValue(GUEST);
    render(<RsvpEntryPage />);
    fireEvent.change(screen.getByLabelText('Invitation code'), { target: { value: 'abc123' } });
    fireEvent.submit(screen.getByLabelText('Invitation code').closest('form')!);
    await act(async () => { jest.advanceTimersByTime(2000); });
    jest.useRealTimers();
    await waitFor(() => expect(getRememberedInvitationCode()).toBe('ABC123'));
  });

  it('does not remember a code that finds nothing', async () => {
    jest.useFakeTimers();
    api.getRsvpByCode.mockResolvedValue(null);
    render(<RsvpEntryPage />);
    fireEvent.change(screen.getByLabelText('Invitation code'), { target: { value: 'WRONG' } });
    fireEvent.submit(screen.getByLabelText('Invitation code').closest('form')!);
    await act(async () => { jest.advanceTimersByTime(2000); });
    jest.useRealTimers();
    expect(getRememberedInvitationCode()).toBe('');
  });

  it('remembers the code when the RSVP link from the email is opened, and forgets it if invalid', () => {
    const { rerender } = render(<RsvpInvitationView code="ABC123" guest={GUEST as never} settings={null} />);
    expect(getRememberedInvitationCode()).toBe('ABC123');
    rerender(<RsvpInvitationView code="ABC123" guest={null} settings={null} />);
    expect(getRememberedInvitationCode()).toBe('');
  });
});

describe('Photo sharing page', () => {
  it('fills in the code used before (e.g. from the RSVP)', async () => {
    rememberInvitationCode('ABC123');
    render(<GuestPhotoUpload />);
    await waitFor(() => expect(screen.getByLabelText(/invitation code/i)).toHaveValue('ABC123'));
    expect(api.verifyGalleryCode).not.toHaveBeenCalled(); // filled in, not signed in automatically
  });

  it('remembers a code that works', async () => {
    api.verifyGalleryCode.mockResolvedValueOnce({ name: 'Maria Santos' });
    render(<GuestPhotoUpload />);
    fireEvent.change(screen.getByLabelText(/invitation code/i), { target: { value: 'abc123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Maria Santos');
    expect(getRememberedInvitationCode()).toBe('ABC123');
  });

  it('forgets a remembered code that is no longer valid', async () => {
    rememberInvitationCode('OLD12345');
    api.verifyGalleryCode.mockRejectedValue(new ApiError(404, 'Invitation code not found'));
    render(<GuestPhotoUpload />);
    await waitFor(() => expect(screen.getByLabelText(/invitation code/i)).toHaveValue('OLD12345'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText(/couldn't find that invitation code/);
    expect(getRememberedInvitationCode()).toBe('');
  });
});
