import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  SessionExpiredError, authFetch, isTokenExpired, navigation, resetSessionStateForTests, safeNextPath,
} from '@/lib/session';
import { adminApi } from '@/lib/adminApi';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';

let mockPathname = '/dashboard';
let mockSearchParams = new URLSearchParams();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));
jest.mock('@/components/AuthProviderButtons', () => ({ __esModule: true, default: () => null }));

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const jwt = (exp: number) => `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', exp })}.sig`;
const VALID = jwt(Math.floor(Date.now() / 1000) + 3600);
const EXPIRED = jwt(Math.floor(Date.now() / 1000) - 60);

const response = (status: number, body: unknown = {}) =>
  ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }) as Response;

let assign: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetSessionStateForTests();
  assign = jest.spyOn(navigation, 'assign').mockImplementation(() => {});
  localStorage.setItem('access_token', VALID);
  localStorage.setItem('user_email', 'admin@example.com');
  document.cookie = 'logged_in=true; path=/';
  window.history.pushState({}, '', '/dashboard/guests?group=Family');
  global.fetch = jest.fn().mockResolvedValue(response(200, []));
});

afterEach(() => assign.mockRestore());

const expectLoggedOut = () => {
  expect(assign).toHaveBeenCalledWith(`/login?expired=1&next=${encodeURIComponent('/dashboard/guests?group=Family')}`);
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('user_email')).toBeNull();
  expect(document.cookie).not.toContain('logged_in=true');
};

describe('token helpers', () => {
  it('detects expired tokens from the JWT exp claim', () => {
    expect(isTokenExpired(VALID)).toBe(false);
    expect(isTokenExpired(EXPIRED)).toBe(true);
  });

  it('leaves unreadable tokens for the API to judge', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(false);
  });

  it('only returns to dashboard pages after login', () => {
    expect(safeNextPath('/dashboard/guests?x=1')).toBe('/dashboard/guests?x=1');
    expect(safeNextPath('https://evil.example.com')).toBe('/dashboard');
    expect(safeNextPath('//evil.example.com')).toBe('/dashboard');
    expect(safeNextPath(null)).toBe('/dashboard');
  });
});

describe('authFetch', () => {
  it('sends the token and passes normal responses through', async () => {
    const res = await authFetch('http://api/admin/guests');
    expect(res.status).toBe(200);
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe(`Bearer ${VALID}`);
    expect(assign).not.toHaveBeenCalled();
  });

  it('logs out and redirects when the API rejects the token (401)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(401));
    await expect(authFetch('http://api/admin/guests')).rejects.toBeInstanceOf(SessionExpiredError);
    expectLoggedOut();
  });

  it('redirects without calling the API when the token has already expired', async () => {
    localStorage.setItem('access_token', EXPIRED);
    await expect(authFetch('http://api/admin/guests')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(global.fetch).not.toHaveBeenCalled();
    expectLoggedOut();
  });

  it('redirects when there is no token at all', async () => {
    localStorage.removeItem('access_token');
    await expect(authFetch('http://api/admin/guests')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(assign).toHaveBeenCalled();
  });

  it('does not log out on other errors (e.g. 400 validation, 500)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(400, { message: 'Current password is incorrect.' }));
    expect((await authFetch('http://api/auth/password')).status).toBe(400);
    (global.fetch as jest.Mock).mockResolvedValue(response(500));
    expect((await authFetch('http://api/admin/guests')).status).toBe(500);
    expect(assign).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBe(VALID);
  });
});

describe('admin actions (CRUD) with a removed session', () => {
  it.each([
    ['create', () => adminApi.createGuest({ primaryName: 'Juan' })],
    ['update', () => adminApi.updateGuest('g1', { primaryName: 'Juan' })],
    ['delete', () => adminApi.deleteGuest('g1')],
    ['read', () => adminApi.getGuests()],
  ])('%s redirects to login when the API answers 401', async (_, action) => {
    (global.fetch as jest.Mock).mockResolvedValue(response(401, { message: 'Unauthorized' }));
    await expect(action()).rejects.toThrow('Your session has expired');
    expectLoggedOut();
  });

  it('still shows normal API errors without logging out', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(400, { message: 'email must be an email' }));
    await expect(adminApi.createGuest({ primaryName: 'Juan', email: 'x' })).rejects.toThrow('email must be an email');
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('useAuth (dashboard page changes)', () => {
  function Probe() {
    const { user, loading } = useAuth();
    return <p>{loading ? 'loading' : user ? `hello ${user.email}` : 'no user'}</p>;
  }

  it('re-checks the session on every page change and redirects once it is removed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(200, { userId: 'u1', email: 'admin@example.com' }));
    mockPathname = '/dashboard';
    const { rerender } = render(<Probe />);
    expect(await screen.findByText('hello admin@example.com')).toBeInTheDocument();

    // The session is revoked on the server; the next page change notices.
    (global.fetch as jest.Mock).mockResolvedValue(response(401));
    mockPathname = '/dashboard/guests';
    rerender(<Probe />);
    await waitFor(() => expect(assign).toHaveBeenCalled());
    expect((global.fetch as jest.Mock).mock.calls.map(c => c[0])).toEqual([
      expect.stringContaining('/auth/me'), expect.stringContaining('/auth/me'),
    ]);
    expectLoggedOut();
  });

  it('keeps the user signed in when the check fails for a network reason', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Probe />);
    expect(await screen.findByText('no user')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBe(VALID);
  });
});

describe('login page after expiry', () => {
  afterEach(() => { mockSearchParams = new URLSearchParams(); });

  it('explains why and returns to the previous page after signing in', async () => {
    mockSearchParams = new URLSearchParams({ expired: '1', next: '/dashboard/guests?group=Family' });
    (global.fetch as jest.Mock).mockResolvedValue(response(201, { access_token: VALID }));
    render(<LoginForm />);

    expect(screen.getByRole('status')).toHaveTextContent('Your session has expired. Please log in again.');
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/guests?group=Family'));
  });

  it('ignores a next link pointing outside the dashboard', async () => {
    mockSearchParams = new URLSearchParams({ next: 'https://evil.example.com' });
    (global.fetch as jest.Mock).mockResolvedValue(response(201, { access_token: VALID }));
    render(<LoginForm />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });
});
