import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RsvpEntryPage from '@/components/public/RsvpEntryPage';
import { publicApi } from '@/lib/api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), useSearchParams: () => new URLSearchParams() }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/public/RsvpForm', () => ({ __esModule: true, default: () => <p>RSVP form</p> }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), publicApi: { getRsvpByCode: jest.fn(), getSettings: jest.fn() } }));
const api = publicApi as unknown as Record<string, jest.Mock>;

const GUEST = { id: 'g1', primaryName: 'Maria Santos', email: null, phone: null, allowedPartySize: 1, plusOneAllowed: false, requiresMealSelection: false, rsvp: null };
const hint = () => screen.getByText("Boop Odie's nose to open your invitation");
const nose = () => screen.getByRole('button', { name: "Boop Odie's nose to open your invitation" });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  localStorage.clear();
  api.getRsvpByCode.mockResolvedValue(GUEST);
  api.getSettings.mockResolvedValue(null);
});
afterEach(() => jest.useRealTimers());

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('Opening the invitation only by booping Odie\'s nose', () => {
  it('ignores Enter in the code box, pointing to the nose instead', async () => {
    const u = user();
    render(<RsvpEntryPage />);
    await u.type(screen.getByLabelText('Invitation code'), 'ABC123{Enter}');
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(api.getRsvpByCode).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Invitation code')).toHaveValue('ABC123'); // still on the first screen
  });

  it('lights up the hint briefly when Enter is pressed', async () => {
    const u = user();
    render(<RsvpEntryPage />);
    expect(hint()).not.toHaveAttribute('data-nudge');
    await u.type(screen.getByLabelText('Invitation code'), 'ABC123{Enter}');
    expect(hint()).toHaveAttribute('data-nudge', 'true');
    expect(hint()).toHaveClass('text-[var(--accent)]');
    await act(async () => { jest.advanceTimersByTime(1600); });
    expect(hint()).not.toHaveAttribute('data-nudge');
  });

  it('opens the invitation when the nose is booped', async () => {
    const u = user();
    render(<RsvpEntryPage />);
    await u.type(screen.getByLabelText('Invitation code'), 'abc123');
    await u.click(nose());
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(api.getRsvpByCode).toHaveBeenCalledWith('ABC123');
    expect(await screen.findByText('Hello, Maria Santos!')).toBeInTheDocument();
  });

  it('can still be opened from the keyboard, by tabbing to the nose', async () => {
    const u = user();
    render(<RsvpEntryPage />);
    await u.type(screen.getByLabelText('Invitation code'), 'abc123');
    nose().focus();
    await u.keyboard('{Enter}');
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(api.getRsvpByCode).toHaveBeenCalledWith('ABC123');
  });

  it('shows "Done" rather than "Go" on phone keyboards', () => {
    render(<RsvpEntryPage />);
    expect(screen.getByLabelText('Invitation code')).toHaveAttribute('enterkeyhint', 'done');
  });
});
