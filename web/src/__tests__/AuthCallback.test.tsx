import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthCallback from '@/app/auth/callback/page';

const mockPush = jest.fn();
let mockParams: Record<string, string | null> = {};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => mockParams[key] ?? null,
  }),
}));

describe('AuthCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockParams = {};
  });

  it('shows loading state while processing', () => {
    mockParams = {};
    render(<AuthCallback />);
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument();
  });

  it('stores token and redirects to /dashboard on success', async () => {
    mockParams = { token: 'jwt-token-123' };
    render(<AuthCallback />);

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('jwt-token-123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to / when no token and no error', async () => {
    mockParams = {};
    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message when error param is present', async () => {
    mockParams = { error: encodeURIComponent('An account with this email already exists using google.') };
    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText(/already exists using google/i)).toBeInTheDocument();
    });
  });

  it('does not redirect when error param is present', async () => {
    mockParams = { error: encodeURIComponent('Some error') };
    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error and does not redirect when both token and error params are present', async () => {
    mockParams = { token: 'jwt-token-123', error: encodeURIComponent('Some error') };
    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('navigates to / when Back to sign in is clicked', async () => {
    mockParams = { error: encodeURIComponent('Some error') };
    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
