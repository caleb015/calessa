import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/dashboard/profile/page';

const mockPush = jest.fn();
const mockGetParam = jest.fn().mockReturnValue(null);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGetParam }),
}));

jest.mock('@/config/app', () => ({
  appConfig: { apiUrl: 'http://localhost:3001' },
}));

const mockProfile = {
  userId: 'user-123',
  email: 'test@example.com',
  name: 'Test User' as string | null,
  hasPassword: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockProviders = [{ provider: 'google', linkedAt: '2026-01-01T00:00:00.000Z' }];

function setupFetch(profile = mockProfile, providers = mockProviders) {
  (global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
    const method: string = opts?.method ?? 'GET';
    if (url.includes('/auth/me')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(profile) });
    }
    if (url.includes('/auth/providers') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(providers) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParam.mockReturnValue(null);
    localStorage.setItem('access_token', 'mock-token');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── auth guard ───────────────────────────────────────────────────────────────

  it('redirects to / when no token in localStorage', () => {
    localStorage.removeItem('access_token');
    render(<ProfilePage />);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  // ── initial load ─────────────────────────────────────────────────────────────

  it('renders email and member since after loading', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument());
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
  });

  it('shows no password section message when user has no password', async () => {
    setupFetch({ ...mockProfile, hasPassword: false });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText(/no password set/i)).toBeInTheDocument());
  });

  // ── URL param banners ─────────────────────────────────────────────────────────

  it('shows success banner when ?linked=google', async () => {
    mockGetParam.mockImplementation((k: string) => k === 'linked' ? 'google' : null);
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() =>
      expect(screen.getByText(/google account connected/i)).toBeInTheDocument(),
    );
  });

  it('shows error banner when ?error=provider_taken', async () => {
    mockGetParam.mockImplementation((k: string) => k === 'error' ? 'provider_taken' : null);
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() =>
      expect(screen.getByText(/already linked to a different user/i)).toBeInTheDocument(),
    );
  });

  // ── display name ─────────────────────────────────────────────────────────────

  it('shows error and skips API call when saving an empty display name', async () => {
    setupFetch({ ...mockProfile, name: null });
    render(<ProfilePage />);
    await waitFor(() => screen.getByPlaceholderText('Your display name'));
    await userEvent.clear(screen.getByPlaceholderText('Your display name'));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/auth/profile'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows success message after saving display name', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByPlaceholderText('Your display name'));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.getByText(/display name updated/i)).toBeInTheDocument(),
    );
  });

  it('clears name message when typing', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByPlaceholderText('Your display name'));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => screen.getByText(/display name updated/i));
    await userEvent.type(screen.getByPlaceholderText('Your display name'), 'x');
    expect(screen.queryByText(/display name updated/i)).not.toBeInTheDocument();
  });

  // ── change password ───────────────────────────────────────────────────────────

  it('shows error when new passwords do not match', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByPlaceholderText('Current password'));
    await userEvent.type(screen.getByPlaceholderText('Current password'), 'current');
    await userEvent.type(screen.getByPlaceholderText(/new password \(min/i), 'newpass1');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'newpass2');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/auth/password'),
      expect.anything(),
    );
  });

  it('shows success and clears fields after password change', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByPlaceholderText('Current password'));
    const currentInput = screen.getByPlaceholderText('Current password');
    const newInput = screen.getByPlaceholderText(/new password \(min/i);
    const confirmInput = screen.getByPlaceholderText('Confirm new password');
    await userEvent.type(currentInput, 'current');
    await userEvent.type(newInput, 'newpass1');
    await userEvent.type(confirmInput, 'newpass1');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeInTheDocument());
    expect(currentInput).toHaveValue('');
  });

  it('clears password message when typing', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByPlaceholderText('Current password'));
    await userEvent.type(screen.getByPlaceholderText('Current password'), 'c');
    await userEvent.type(screen.getByPlaceholderText(/new password \(min/i), 'newpass1');
    await userEvent.type(screen.getByPlaceholderText('Confirm new password'), 'newpass1');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => screen.getByText(/password updated/i));
    await userEvent.type(screen.getByPlaceholderText('Current password'), 'x');
    expect(screen.queryByText(/password updated/i)).not.toBeInTheDocument();
  });

  // ── connected accounts ────────────────────────────────────────────────────────

  it('shows Disconnect for linked providers and Connect for others', async () => {
    setupFetch(mockProfile, [{ provider: 'google', linkedAt: '2026-01-01' }]);
    render(<ProfilePage />);
    await waitFor(() => screen.getByText(/connected accounts/i));
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^connect$/i }).length).toBe(2); // facebook + x
  });

  it('calls DELETE and shows banner when disconnecting a provider', async () => {
    setupFetch(mockProfile, [
      { provider: 'google', linkedAt: '2026-01-01' },
      { provider: 'facebook', linkedAt: '2026-01-01' },
    ]);
    render(<ProfilePage />);
    await waitFor(() => screen.getAllByRole('button', { name: /disconnect/i }));
    await userEvent.click(screen.getAllByRole('button', { name: /disconnect/i })[0]);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/providers/'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText(/account disconnected/i)).toBeInTheDocument(),
    );
  });

  // ── delete account ────────────────────────────────────────────────────────────

  it('opens delete modal and keeps confirm button disabled until email matches', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByRole('button', { name: /delete my account/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }));
    const confirmBtn = screen.getByRole('button', { name: /^delete account$/i });
    expect(confirmBtn).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/type your email/i), 'test@example.com');
    expect(confirmBtn).not.toBeDisabled();
  });

  it('clears storage and redirects to / after account deletion', async () => {
    setupFetch();
    render(<ProfilePage />);
    await waitFor(() => screen.getByRole('button', { name: /delete my account/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }));
    await userEvent.type(screen.getByPlaceholderText(/type your email/i), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /^delete account$/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
