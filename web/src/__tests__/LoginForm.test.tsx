import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/LoginForm';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Prevent AuthProviderButtons from making real window.location changes
jest.mock('@/components/AuthProviderButtons', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-provider-buttons" />,
}));

const mockFetch = (ok: boolean, body: object) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(body),
  });
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  // ── rendering ───────────────────────────────────────────────────────────────

  it('renders sign in mode by default', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });

  it('switches to register mode when Register link is clicked', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('switches back to sign in when Sign In link is clicked', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  // ── login ───────────────────────────────────────────────────────────────────

  it('POSTs to /auth/login on sign in submit', async () => {
    mockFetch(true, { access_token: 'token-123' });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('stores access_token and user_email in localStorage on successful login', async () => {
    mockFetch(true, { access_token: 'token-123' });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('token-123');
      expect(localStorage.getItem('user_email')).toBe('user@example.com');
    });
  });

  it('redirects to /dashboard on successful login', async () => {
    mockFetch(true, { access_token: 'token-123' });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on failed login', async () => {
    mockFetch(false, { message: 'Invalid credentials' });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('displays first message when error is an array', async () => {
    mockFetch(false, { message: ['email must be valid', 'password too short'] });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'bad@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('email must be valid')).toBeInTheDocument();
    });
  });

  it('displays fallback error when server is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText(/unable to reach the server/i)).toBeInTheDocument();
    });
  });

  it('disables submit button and shows loading text while request is in flight', async () => {
    let resolveResponse: (value: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((res) => { resolveResponse = res; }),
    );
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    const btn = screen.getByRole('button', { name: /please wait/i });
    expect(btn).toBeDisabled();

    resolveResponse!({ ok: true, json: async () => ({ access_token: 'tok' }) });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('clears error message when switching modes', async () => {
    mockFetch(false, { message: 'Invalid credentials' });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
  });

  // ── register ─────────────────────────────────────────────────────────────────

  it('shows confirm password field only in register mode', async () => {
    render(<LoginForm />);
    expect(screen.queryByPlaceholderText('Repeat your password')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument();
  });

  it('shows error and skips API call when passwords do not match', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
    await userEvent.type(screen.getByPlaceholderText(/min\. 8/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Repeat your password'), 'different123');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('POSTs to /auth/register when passwords match', async () => {
    mockFetch(true, {});
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
    await userEvent.type(screen.getByPlaceholderText(/min\. 8/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Repeat your password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('displays error message on failed registration', async () => {
    mockFetch(false, { message: 'Email already in use' });
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'existing@example.com');
    await userEvent.type(screen.getByPlaceholderText(/min\. 8/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Repeat your password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });
  });

  it('shows success message and switches to sign in after registration', async () => {
    mockFetch(true, {});
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
    await userEvent.type(screen.getByPlaceholderText(/min\. 8/i), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Repeat your password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });
  });

  it('clears confirm password when switching modes', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    await userEvent.type(screen.getByPlaceholderText('Repeat your password'), 'something');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByPlaceholderText('Repeat your password')).toHaveValue('');
  });
});
