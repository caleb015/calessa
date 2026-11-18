import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentPage from '@/app/dashboard/content/page';
import GalleryGrid from '@/components/public/GalleryGrid';
import { adminApi } from '@/lib/adminApi';
import { publicApi } from '@/lib/api';
import type { GalleryImage } from '@/types/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/content',
  useSearchParams: () => new URLSearchParams(),
}));

// Every admin API call resolves to [] unless a test says otherwise.
jest.mock('@/lib/adminApi', () => {
  const fns: Record<string, jest.Mock> = {};
  return {
    adminApi: new Proxy(fns, {
      get: (target, key: string) => (target[key] ??= jest.fn().mockResolvedValue([])),
    }),
  };
});
const admin = adminApi as unknown as Record<string, jest.Mock>;

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  publicApi: { getGalleryPage: jest.fn() },
}));
const getGalleryPage = publicApi.getGalleryPage as jest.Mock;

const CLD = (name: string) => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${name}.jpg`;

beforeEach(() => {
  jest.clearAllMocks();
  admin.getGallerySettings.mockResolvedValue({ uploadsEnabled: false, requireApproval: true, heading: '', subtext: '', buttonLabel: '', defaults: { heading: '', subtext: '', buttonLabel: '' } });
});

describe('Dashboard gallery with many photos', () => {
  const photos = (n: number, pending: number[] = []) =>
    Array.from({ length: n }, (_, i) => ({
      id: `p${i + 1}`, imageUrl: CLD(`p${i + 1}`), title: `Photo ${i + 1}`, displayOrder: i,
      isPublished: !pending.includes(i + 1), guest: pending.includes(i + 1) ? { primaryName: 'Ana' } : null,
    }));
  const rows = () => screen.getAllByRole('button', { name: 'Edit' });

  async function openGallery() {
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    await screen.findByText('Photo 1');
  }

  it('lists 50 photos at a time', async () => {
    admin.getGallery.mockResolvedValue(photos(120));
    await openGallery();
    expect(screen.getByText('120 items')).toBeInTheDocument();
    expect(rows()).toHaveLength(50);
    expect(screen.getByText('1–50 of 120')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Previous' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.getByText('51–100 of 120')).toBeInTheDocument();
    expect(screen.getByText('Photo 51')).toBeInTheDocument();
    expect(screen.queryByText('Photo 50')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(rows()).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Next →' })).toBeDisabled();
  });

  it('opens on the first page, even when React mounts it twice (development mode)', async () => {
    admin.getGallery.mockResolvedValue(photos(120));
    render(<React.StrictMode><ContentPage /></React.StrictMode>);
    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    expect(await screen.findByText('1–50 of 120')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Story' }));
    await userEvent.click(screen.getByRole('button', { name: 'Gallery' }));
    expect(await screen.findByText('1–50 of 120')).toBeInTheDocument();
  });

  it('has no pages for a short list', async () => {
    admin.getGallery.mockResolvedValue(photos(50));
    await openGallery();
    expect(rows()).toHaveLength(50);
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });

  it('starts again at the first page on another tab', async () => {
    admin.getGallery.mockResolvedValue(photos(60));
    await openGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Next →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Story' }));
    await userEvent.click(screen.getByRole('button', { name: 'Gallery' }));
    expect(screen.getByText('1–50 of 60')).toBeInTheDocument();
  });

  it('shows photos waiting for approval on their own', async () => {
    admin.getGallery.mockResolvedValue(photos(80, [3, 55, 79]));
    admin.updateGalleryImage.mockImplementation(async (id: string, body: object) => ({
      ...photos(80).find(p => p.id === id), guest: { primaryName: 'Ana' }, ...body,
    }));
    await openGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Pending approval (3)' }));
    expect(rows()).toHaveLength(3);
    expect(screen.getAllByRole('checkbox', { name: /^Published:/ }).filter(b => !(b as HTMLInputElement).checked)).toHaveLength(3);
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Photo 3' }));
    expect(await screen.findByRole('button', { name: 'Pending approval (2)' })).toBeInTheDocument();
    expect(rows()).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'All (80)' }));
    expect(rows()).toHaveLength(50);
  });

  it('shows the last page, with the new photos, after uploading', async () => {
    admin.getGallery.mockResolvedValue(photos(60));
    admin.getUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa', allowed_formats: 'jpg' });
    admin.createGalleryImage.mockImplementation(async (body: { imageUrl: string }) => ({ id: body.imageUrl, title: 'Just added', guest: null, ...body }));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/new.jpg' }),
    }) as jest.Mock;
    await openGallery();

    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [new File(['x'], 'new.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByText('Just added')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('51–61 of 61')).toBeInTheDocument());
  });
});

describe('Public gallery with many photos', () => {
  const image = (n: number): GalleryImage => ({ id: `g${n}`, title: `Photo ${n}`, description: null, imageUrl: CLD(`g${n}`), displayOrder: n });

  it('shows small square copies in the grid and a screen-sized one in the viewer', async () => {
    render(<GalleryGrid images={[image(1)]} />);
    const thumb = screen.getByRole('img', { name: 'Photo 1' });
    expect(thumb).toHaveAttribute('src', expect.stringContaining(',c_fill,w_400,h_400/'));
    expect(thumb).toHaveAttribute('srcset', expect.stringContaining(',c_fill,w_700,h_700/'));
    expect(thumb).toHaveAttribute('loading', 'lazy');

    await userEvent.click(screen.getByRole('button', { name: 'Photo 1' }));
    const big = screen.getAllByRole('img', { name: 'Photo 1' }).pop()!;
    expect(big).toHaveAttribute('src', expect.stringContaining(',c_limit,w_1920/'));
  });

  it('falls back to the original when a small copy cannot be made', () => {
    render(<GalleryGrid images={[image(1)]} />);
    const thumb = screen.getByRole('img', { name: 'Photo 1' });
    fireEvent.error(thumb);
    expect(thumb).toHaveAttribute('src', CLD('g1'));
  });

  it('fetches more photos when asked, until all are shown', async () => {
    getGalleryPage.mockResolvedValue({ images: [image(3), image(4)], total: 4 });
    render(<GalleryGrid images={[image(1), image(2)]} total={4} />);
    expect(screen.getByText('2 of 4')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show more photos' }));
    expect(getGalleryPage).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('button', { name: 'Photo 4' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Show more photos' })).not.toBeInTheDocument();
  });

  it('offers to try again when more photos fail to load', async () => {
    getGalleryPage.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ images: [image(2)], total: 2 });
    render(<GalleryGrid images={[image(1)]} total={2} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show more photos' }));
    await userEvent.click(await screen.findByRole('button', { name: /Couldn't load more photos/ }));
    expect(await screen.findByRole('button', { name: 'Photo 2' })).toBeInTheDocument();
  });

  it('moves past the last loaded photo in the viewer by fetching more', async () => {
    getGalleryPage.mockResolvedValue({ images: [image(3)], total: 3 });
    render(<GalleryGrid images={[image(1), image(2)]} total={3} />);
    await userEvent.click(screen.getByRole('button', { name: 'Photo 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    const viewer = () => screen.getByRole('button', { name: 'Close' }).parentElement!;
    await waitFor(() => expect(within(viewer()).getByRole('img', { name: 'Photo 3' })).toBeInTheDocument());

    // Everything is loaded now, so "next" goes back to the start.
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(within(viewer()).getByRole('img', { name: 'Photo 1' })).toBeInTheDocument();
  });
});
