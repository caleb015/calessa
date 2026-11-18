import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PublicLayout from '@/app/(public)/layout';
import PreviewPage from '@/app/dashboard/preview/page';
import { publicApi } from '@/lib/api';
import { adminApi } from '@/lib/adminApi';
import { clearPreviewCookie, getPreviewToken, setPreviewCookie } from '@/lib/preview';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@/lib/api', () => ({ publicApi: { getSettings: jest.fn() } }));
jest.mock('@/lib/adminApi', () => ({ adminApi: { createPreviewToken: jest.fn(), getSettings: jest.fn() } }));

const settings = (over: Record<string, unknown>) => ({ coupleNameA: 'Caleb', coupleNameB: 'Raissa', monogramUrl: null, ...over });

async function renderLayout() {
  render(await PublicLayout({ children: <p>Site content</p> }));
}

describe('public layout visibility', () => {
  it('shows Under Maintenance and hides the site when the site is not public', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ isPublic: false, preview: false }));
    await renderLayout();
    expect(screen.getByRole('heading', { name: 'Under Maintenance' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /wedding arch being set up/i })).toBeInTheDocument();
    expect(screen.queryByText('Site content')).not.toBeInTheDocument();
  });

  it('counts down to the wedding on the Under Maintenance page', async () => {
    const inThreeDays = new Date(Date.now() + 3 * 86400000 + 5 * 3600000 + 60000).toISOString();
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ isPublic: false, preview: false, weddingDate: inThreeDays }));
    await renderLayout();
    expect(screen.getByText('Until we say I do')).toBeInTheDocument();
    expect(screen.getByText('Days').previousSibling).toHaveTextContent('03');
    expect(screen.getByText('Hours').previousSibling).toHaveTextContent('05');
    expect(screen.getByText('Seconds')).toBeInTheDocument();
  });

  it('leaves the countdown out until a wedding date is set', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ isPublic: false, preview: false, weddingDate: null }));
    await renderLayout();
    expect(screen.getByRole('heading', { name: 'Under Maintenance' })).toBeInTheDocument();
    expect(screen.queryByText('Until we say I do')).not.toBeInTheDocument();
  });

  it('shows the site with a preview banner for an admin preview', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ isPublic: false, preview: true }));
    await renderLayout();
    expect(screen.getByText('Site content')).toBeInTheDocument();
    expect(screen.getByText(/Preview: the site is not public/)).toBeInTheDocument();
  });

  it('shows the site without a banner when public', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ isPublic: true, preview: false }));
    await renderLayout();
    expect(screen.getByText('Site content')).toBeInTheDocument();
    expect(screen.queryByText(/Preview:/)).not.toBeInTheDocument();
  });

  it('still shows the site if settings cannot be loaded', async () => {
    (publicApi.getSettings as jest.Mock).mockRejectedValue(new Error('down'));
    await renderLayout();
    expect(screen.getByText('Site content')).toBeInTheDocument();
  });
});

describe('preview cookie', () => {
  afterEach(() => clearPreviewCookie());

  it('round-trips the token and clears it', async () => {
    setPreviewCookie('abc.def=ghi');
    expect(await getPreviewToken()).toBe('abc.def=ghi');
    clearPreviewCookie();
    expect(await getPreviewToken()).toBeNull();
  });
});

describe('dashboard preview page', () => {
  afterEach(() => clearPreviewCookie());

  it('stores a preview token and shows the site in a frame', async () => {
    (adminApi.createPreviewToken as jest.Mock).mockResolvedValue({ token: 'preview-token' });
    (adminApi.getSettings as jest.Mock).mockResolvedValue({ isPublic: false });
    render(<PreviewPage />);

    const frame = await screen.findByTitle('Site preview');
    expect(frame).toHaveAttribute('src', '/');
    expect(await getPreviewToken()).toBe('preview-token');
    expect(await screen.findByText(/visitors see Under Maintenance/)).toBeInTheDocument();
  });

  it('shows an error if the token cannot be issued', async () => {
    (adminApi.createPreviewToken as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
    (adminApi.getSettings as jest.Mock).mockResolvedValue({ isPublic: true });
    render(<PreviewPage />);
    await waitFor(() => expect(screen.getByText('Unauthorized')).toBeInTheDocument());
    expect(screen.queryByTitle('Site preview')).not.toBeInTheDocument();
  });
});
