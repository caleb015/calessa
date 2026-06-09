import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessagesPage from '@/app/dashboard/messages/page';

jest.mock('@/lib/adminApi', () => ({
  adminApi: {
    getRsvps: jest.fn(),
  },
}));

import { adminApi } from '@/lib/adminApi';
const mockGetRsvps = adminApi.getRsvps as jest.Mock;

const mockRsvps = [
  { id: '1', message: 'So excited for your big day!', songRequest: null,        submittedAt: '2026-06-01T00:00:00Z', guest: { primaryName: 'Alice' } },
  { id: '2', message: null,                           songRequest: 'September',  submittedAt: '2026-06-02T00:00:00Z', guest: { primaryName: 'Bob' } },
  { id: '3', message: 'Congratulations!',             songRequest: 'Lovely Day', submittedAt: '2026-06-03T00:00:00Z', guest: { primaryName: 'Carol' } },
  { id: '4', message: null,                           songRequest: null,         submittedAt: '2026-06-04T00:00:00Z', guest: { primaryName: 'Dave' } },
];

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRsvps.mockResolvedValue(mockRsvps);
  });

  it('shows a loading state before data arrives', () => {
    mockGetRsvps.mockImplementation(() => new Promise(() => {}));
    render(<MessagesPage />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders messages from guests who left one', async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByText('So excited for your big day!')).toBeInTheDocument();
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('does not show guests with no message in the messages tab', async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('Dave')).not.toBeInTheDocument();
  });

  it('shows song requests when the song requests tab is clicked', async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    await userEvent.click(screen.getByRole('button', { name: /song requests/i }));
    expect(screen.getByText('September')).toBeInTheDocument();
    expect(screen.getByText('Lovely Day')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('does not show guests with no song request in the song requests tab', async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    await userEvent.click(screen.getByRole('button', { name: /song requests/i }));
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Dave')).not.toBeInTheDocument();
  });

  it('shows correct counts in the tab badges', async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    // 2 messages (Alice, Carol), 2 song requests (Bob, Carol)
    const twos = screen.getAllByText('2');
    expect(twos).toHaveLength(2);
  });

  it('shows an empty state when no messages exist', async () => {
    mockGetRsvps.mockResolvedValue([]);
    render(<MessagesPage />);
    await waitFor(() => expect(screen.getByText('No messages yet.')).toBeInTheDocument());
  });

  it('shows an empty state on the song requests tab when none exist', async () => {
    mockGetRsvps.mockResolvedValue([
      { id: '1', message: 'Hi!', songRequest: null, submittedAt: '2026-06-01T00:00:00Z', guest: { primaryName: 'Alice' } },
    ]);
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    await userEvent.click(screen.getByRole('button', { name: /song requests/i }));
    expect(screen.getByText('No song requests yet.')).toBeInTheDocument();
  });

  it('switching back to messages tab restores the messages view', async () => {
    render(<MessagesPage />);
    await waitFor(() => screen.getByText('Alice'));
    await userEvent.click(screen.getByRole('button', { name: /song requests/i }));
    await userEvent.click(screen.getByRole('button', { name: /^messages/i }));
    expect(screen.getByText('So excited for your big day!')).toBeInTheDocument();
  });
});
