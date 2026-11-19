import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentPage from '@/app/dashboard/content/page';
import DashboardLayout from '@/app/dashboard/layout';
import { useUnsavedChangesWarning, LEAVE_MESSAGE } from '@/lib/unsavedChanges';
import { adminApi } from '@/lib/adminApi';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/content',
  useSearchParams: () => new URLSearchParams(),
}));

// Every admin API call resolves to [] unless a test says otherwise.
jest.mock('@/lib/adminApi', () => {
  const fns: Record<string, jest.Mock> = {};
  return { adminApi: new Proxy(fns, { get: (t, k: string) => (t[k] ??= jest.fn().mockResolvedValue([])) }) };
});
const admin = adminApi as unknown as Record<string, jest.Mock>;

const logout = jest.fn();
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'us@example.com' }, loading: false, logout }) }));

let confirmSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  admin.getGallerySettings.mockResolvedValue({ uploadsEnabled: false, requireApproval: true, heading: '', subtext: '', buttonLabel: '', defaults: { heading: '', subtext: '', buttonLabel: '' } });
});
afterEach(async () => {
  cleanup();
  await new Promise(r => setTimeout(r, 10)); // let the page tidy its history away before the next test
  confirmSpy.mockRestore();
});

describe('Content page tabs with unsaved changes', () => {
  async function editGallerySharing() {
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    await userEvent.click(await screen.findByLabelText(/Let invited guests upload photos/));
  }

  it('asks before switching tabs, and stays with the changes if told to', async () => {
    await editGallerySharing();
    await userEvent.click(screen.getByRole('button', { name: 'FAQs' }));
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Discard them?');
    expect(screen.getByLabelText(/Let invited guests upload photos/)).toBeChecked();
  });

  it('switches once discarding is confirmed', async () => {
    confirmSpy.mockReturnValue(true);
    await editGallerySharing();
    await userEvent.click(screen.getByRole('button', { name: 'FAQs' }));
    expect(screen.queryByLabelText(/Let invited guests upload photos/)).not.toBeInTheDocument();
  });

  it('switches without asking when nothing is unsaved', async () => {
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    await screen.findByLabelText(/Let invited guests upload photos/);
    await userEvent.click(screen.getByRole('button', { name: 'FAQs' }));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe('Dashboard sidebar with unsaved changes', () => {
  function UnsavedForm() {
    useUnsavedChangesWarning(true);
    return <a href="https://example.com/help" target="_blank" rel="noreferrer">Help</a>;
  }
  const renderDashboard = () => render(<DashboardLayout><UnsavedForm /></DashboardLayout>);

  it('asks before Logout, and stays logged in if told to', async () => {
    renderDashboard();
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(confirmSpy).toHaveBeenCalledWith(LEAVE_MESSAGE);
    expect(logout).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(logout).toHaveBeenCalled();
  });

  it('asks before following a sidebar link', () => {
    renderDashboard();
    expect(fireEvent.click(screen.getByRole('link', { name: 'Guests' }))).toBe(false); // stopped
    expect(confirmSpy).toHaveBeenCalledWith(LEAVE_MESSAGE);
  });

  it('does not ask for links opened in a new tab (the page stays open)', () => {
    const noNavigation = (e: Event) => e.preventDefault(); // jsdom can't open pages; stop it trying (after our check)
    document.addEventListener('click', noNavigation);
    try {
      renderDashboard();
      fireEvent.click(screen.getByRole('link', { name: 'Guests' }), { ctrlKey: true });
      fireEvent.click(screen.getByRole('link', { name: 'Guests' }), { metaKey: true });
      fireEvent.click(screen.getByRole('link', { name: 'Help' }));
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('click', noNavigation);
    }
  });
});
