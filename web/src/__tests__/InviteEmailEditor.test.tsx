import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteEmailEditor from '@/components/dashboard/InviteEmailEditor';

jest.mock('@/lib/adminApi', () => ({
  adminApi: {
    getInviteEmail: jest.fn(),
    updateInviteEmail: jest.fn(),
    previewInviteEmail: jest.fn(),
  },
}));

import { adminApi } from '@/lib/adminApi';
const mockGet = adminApi.getInviteEmail as jest.Mock;
const mockUpdate = adminApi.updateInviteEmail as jest.Mock;
const mockPreview = adminApi.previewInviteEmail as jest.Mock;

const FIELDS = [
  'inviteSubject', 'inviteHeading', 'inviteTagline', 'inviteGreeting', 'inviteMessage', 'inviteButtonText', 'inviteSignoff',
  'inviteBackgroundColor', 'inviteTextColor', 'inviteAccentColor', 'inviteMutedColor', 'inviteButtonTextColor',
];
const blank = Object.fromEntries(FIELDS.map(f => [f, '']));
const defaults = { ...Object.fromEntries(FIELDS.map(f => [f, `default ${f}`])), inviteAccentColor: '#5a4a3a', inviteBackgroundColor: '#ffffff', inviteTextColor: '#333333', inviteMutedColor: '#8a7a6a', inviteButtonTextColor: '#ffffff' };
const response = (template: Record<string, string>) => ({ template, defaults, placeholders: ['{guestName}', '{weddingDate}'] });

describe('InviteEmailEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(response({ ...blank, inviteButtonText: 'Saved button' }));
    mockPreview.mockResolvedValue({ subject: 'Preview subject', html: '<p>Preview body</p>' });
  });

  it('loads saved values and shows defaults as placeholders', async () => {
    render(<InviteEmailEditor />);
    expect(await screen.findByLabelText('Button text', { selector: 'input#inviteButtonText' })).toHaveValue('Saved button');
    expect(screen.getByLabelText('Subject line')).toHaveAttribute('placeholder', 'default inviteSubject');
    expect(screen.getByText('{guestName}')).toBeInTheDocument();
  });

  it('renders the server preview with subject and HTML in a sandboxed iframe', async () => {
    render(<InviteEmailEditor />);
    expect(await screen.findByText('Preview subject')).toBeInTheDocument();
    const frame = screen.getByTitle('Invitation email preview');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame).toHaveAttribute('srcdoc', '<p>Preview body</p>');
  });

  it('re-previews unsaved edits after typing', async () => {
    render(<InviteEmailEditor />);
    const subject = await screen.findByLabelText('Subject line');
    await userEvent.type(subject, 'Hi {{guestName}');
    await waitFor(() =>
      expect(mockPreview).toHaveBeenLastCalledWith(expect.objectContaining({ inviteSubject: 'Hi {guestName}' })),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('enables save only when there are changes, then saves the whole form', async () => {
    mockUpdate.mockImplementation(async (body: Record<string, string>) => response(body));
    render(<InviteEmailEditor />);
    const save = await screen.findByRole('button', { name: 'Save Email' });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Tagline'), 'join us');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await userEvent.click(save);

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ inviteTagline: 'join us', inviteButtonText: 'Saved button' }));
    expect(await screen.findByText('Invitation email saved.')).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('shows the API error when saving fails', async () => {
    mockUpdate.mockRejectedValue(new Error('inviteAccentColor must be a hex color (e.g. #5a4a3a)'));
    render(<InviteEmailEditor />);
    await userEvent.type(await screen.findByLabelText('Tagline'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Save Email' }));
    expect(await screen.findByText('inviteAccentColor must be a hex color (e.g. #5a4a3a)')).toBeInTheDocument();
  });

  it('reset clears every field back to defaults without saving', async () => {
    render(<InviteEmailEditor />);
    const button = await screen.findByLabelText('Button text', { selector: 'input#inviteButtonText' });
    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(button).toHaveValue('');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
