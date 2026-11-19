import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '@/app/dashboard/settings/page';
import ContentPage from '@/app/dashboard/content/page';
import { adminApi } from '@/lib/adminApi';
import { croppedUrl } from '@/lib/upload';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/settings',
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

const CLD = (id: string, ext = 'jpg') => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${id}.${ext}`;

beforeEach(() => {
  jest.clearAllMocks();
  admin.getSettings.mockResolvedValue({
    id: 'singleton', coupleNameA: 'Caleb', coupleNameB: 'Raissa', welcomeMessage: 'Hello',
    welcomeImageUrl: null, rsvpBannerImageUrl: null, createdAt: 'x', updatedAt: 'y',
  });
  admin.updateSettings.mockResolvedValue({});
});

describe('Settings: homepage photos', () => {
  it('saves a welcome photo and an RSVP banner photo', async () => {
    render(<SettingsPage />);
    // Pasted in one go (typing long links key by key is slow and adds nothing here).
    await userEvent.click(await screen.findByLabelText(/Welcome Photo/));
    await userEvent.paste(CLD('portrait'));
    await userEvent.click(screen.getByLabelText(/RSVP Banner Photo/));
    await userEvent.paste(CLD('fuji'));
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      welcomeImageUrl: CLD('portrait'), rsvpBannerImageUrl: CLD('fuji'),
    })));
  });

  it('removes a photo when its field is cleared', async () => {
    admin.getSettings.mockResolvedValue({ id: 'singleton', coupleNameA: 'Caleb', coupleNameB: 'Raissa', welcomeImageUrl: CLD('old'), rsvpBannerImageUrl: null });
    render(<SettingsPage />);
    await userEvent.clear(await screen.findByLabelText(/Welcome Photo/));
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ welcomeImageUrl: '' })));
  });

  it('turns on random order for the homepage photos', async () => {
    render(<SettingsPage />);
    await userEvent.click(await screen.findByLabelText(/Moments photos in random order/));
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ homepageGalleryShuffle: true })));
  });

  it('waits for a photo upload to finish before saving', async () => {
    admin.getUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa', allowed_formats: 'jpg' });
    let finish: (v: unknown) => void = () => {};
    global.fetch = jest.fn().mockReturnValue(new Promise(r => { finish = r; })) as jest.Mock;
    render(<SettingsPage />);
    await screen.findByLabelText(/Welcome Photo/);
    // Two "Choose image file" inputs belong to the hero and monogram; the welcome photo's is third.
    const inputs = screen.getAllByLabelText('Choose image file');
    fireEvent.change(inputs[2], { target: { files: [new File(['x'], 'me.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByRole('button', { name: 'Waiting for upload…' })).toBeDisabled();

    finish({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/me.jpg' }) });
    expect(await screen.findByRole('button', { name: 'Save Settings' })).toBeEnabled();
    expect(screen.getByLabelText(/Welcome Photo/)).toHaveValue(CLD('me'));
  });
});

describe('Gallery: quick tick boxes on each photo', () => {
  const gallery = () => [
    { id: 'a', imageUrl: CLD('a'), title: 'Beach', isPublished: true, showOnHomepage: true, displayOrder: 0, guest: null },
    { id: 'b', imageUrl: CLD('b'), title: 'Dinner', isPublished: false, showOnHomepage: false, displayOrder: 1, guest: null },
  ];
  async function openGallery() {
    admin.getGallery.mockResolvedValue(gallery());
    admin.getGallerySettings.mockResolvedValue({ uploadsEnabled: false, requireApproval: true, heading: '', subtext: '', buttonLabel: '', defaults: { heading: '', subtext: '', buttonLabel: '' } });
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    await screen.findByText('Beach');
  }

  it('shows each photo\'s Published and On homepage state', async () => {
    await openGallery();
    expect(screen.getByRole('checkbox', { name: 'Published: Beach' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'On homepage: Beach' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Published: Dinner' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'On homepage: Dinner' })).not.toBeChecked();
  });

  it('saves a tick straight away, without opening the editor', async () => {
    admin.updateGalleryImage.mockImplementation(async (id: string, body: object) => ({ ...gallery().find(p => p.id === id), ...body }));
    await openGallery();
    await userEvent.click(screen.getByRole('checkbox', { name: 'On homepage: Dinner' }));
    await waitFor(() => expect(admin.updateGalleryImage).toHaveBeenCalledWith('b', { showOnHomepage: true }));
    expect(await screen.findByRole('checkbox', { name: 'On homepage: Dinner' })).toBeChecked();
    expect(screen.queryByRole('button', { name: /Save changes/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Beach' }));
    await waitFor(() => expect(admin.updateGalleryImage).toHaveBeenCalledWith('a', { isPublished: false }));
    expect(await screen.findByRole('checkbox', { name: 'Published: Beach' })).not.toBeChecked();
  });

  describe('when saving fails', () => {
    const rowOf = (title: string) => screen.getByText(title).closest('div.bg-white') as HTMLElement;

    it('explains it on that photo\'s own row, keeps the box as it was, and leaves other rows alone', async () => {
      admin.updateGalleryImage.mockRejectedValue(new Error('Gallery image a not found'));
      await openGallery();
      await userEvent.click(screen.getByRole('checkbox', { name: 'On homepage: Beach' }));

      const alert = await within(rowOf('Beach')).findByRole('alert');
      expect(alert).toHaveTextContent("Couldn't remove this photo from the homepage. Gallery image a not found. Please try again.");
      expect(screen.getByRole('checkbox', { name: 'On homepage: Beach' })).toBeChecked();
      expect(within(rowOf('Dinner')).queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });

    it.each([
      ['Published: Dinner', 'Dinner', "Couldn't publish this photo."],
      ['Published: Beach', 'Beach', "Couldn't unpublish this photo."],
      ['On homepage: Dinner', 'Dinner', "Couldn't add this photo to the homepage."],
      ['On homepage: Beach', 'Beach', "Couldn't remove this photo from the homepage."],
    ])('says what didn\'t happen (%s)', async (box, title, says) => {
      admin.updateGalleryImage.mockRejectedValue(new Error('Server error'));
      await openGallery();
      await userEvent.click(screen.getByRole('checkbox', { name: box }));
      expect(await within(rowOf(title)).findByRole('alert')).toHaveTextContent(says);
    });

    it('gives plain advice when the connection is lost', async () => {
      admin.updateGalleryImage.mockRejectedValue(new TypeError('Failed to fetch'));
      await openGallery();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Dinner' }));
      const alert = await within(rowOf('Dinner')).findByRole('alert');
      expect(alert).toHaveTextContent("Couldn't publish this photo. Check your connection and try again.");
      expect(alert).not.toHaveTextContent(/fetch/i);
    });

    it('clears the message once a retry saves', async () => {
      admin.updateGalleryImage
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockImplementation(async (id: string, body: object) => ({ ...gallery().find(p => p.id === id), ...body }));
      await openGallery();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Dinner' }));
      await within(rowOf('Dinner')).findByRole('alert');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Dinner' }));
      await waitFor(() => expect(within(rowOf('Dinner')).queryByRole('alert')).not.toBeInTheDocument());
      expect(screen.getByRole('checkbox', { name: 'Published: Dinner' })).toBeChecked();
    });

    it('keeps the message on a photo when a different photo saves', async () => {
      admin.updateGalleryImage
        .mockRejectedValueOnce(new Error('Server error'))
        .mockImplementation(async (id: string, body: object) => ({ ...gallery().find(p => p.id === id), ...body }));
      await openGallery();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Dinner' }));
      await within(rowOf('Dinner')).findByRole('alert');
      await userEvent.click(screen.getByRole('checkbox', { name: 'On homepage: Beach' }));
      await waitFor(() => expect(screen.getByRole('checkbox', { name: 'On homepage: Beach' })).not.toBeChecked());
      expect(within(rowOf('Dinner')).getByRole('alert')).toBeInTheDocument();
    });

    it('lets the box be used again after a failure', async () => {
      admin.updateGalleryImage.mockRejectedValue(new Error('Server error'));
      await openGallery();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Published: Dinner' }));
      await within(rowOf('Dinner')).findByRole('alert');
      expect(screen.getByRole('checkbox', { name: 'Published: Dinner' })).toBeEnabled();
    });
  });

  it('can also be set from the editor', async () => {
    admin.updateGalleryImage.mockImplementation(async (id: string, body: object) => ({ ...gallery().find(p => p.id === id), ...body }));
    await openGallery();
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    await userEvent.click(screen.getByLabelText('Show on homepage'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(admin.updateGalleryImage).toHaveBeenCalledWith('b', expect.objectContaining({ showOnHomepage: true })));
  });

  it('starts a new photo as published and on the homepage', async () => {
    admin.createGalleryImage.mockImplementation(async (body: object) => ({ id: 'n', guest: null, ...body }));
    await openGallery();
    await userEvent.click(screen.getByRole('button', { name: '+ Add image' }));
    expect(screen.getByRole('checkbox', { name: 'Published' })).toBeChecked(); // the form's own box (rows say "Published: …")
    expect(screen.getByRole('checkbox', { name: 'Show on homepage' })).toBeChecked();
    await userEvent.click(screen.getByPlaceholderText('Upload an image or paste a link'));
    await userEvent.paste(CLD('new'));
    await userEvent.click(screen.getByRole('button', { name: 'Add image' }));
    await waitFor(() => expect(admin.createGalleryImage).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: CLD('new'), isPublished: true, showOnHomepage: true,
    })));
  });

  it('is only on the Gallery tab', async () => {
    render(<ContentPage />);
    await screen.findByRole('button', { name: /\+ Add event/ });
    expect(screen.queryByRole('checkbox', { name: /^On homepage:/ })).not.toBeInTheDocument();
  });
});

describe('croppedUrl', () => {
  it('asks Cloudinary for a copy cropped to size, and leaves other links alone', () => {
    expect(croppedUrl(CLD('walk'), 800, 600))
      .toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,g_auto,w_800,h_600/v1/calessa/walk.jpg');
    expect(croppedUrl('https://example.com/a.gif', 800, 600)).toBe('https://example.com/a.gif');
  });

  it('turns a GIF into a light JPEG still taken a few frames in', () => {
    expect(croppedUrl(CLD('party', 'GIF'), 800, 600))
      .toBe('https://res.cloudinary.com/demo/image/upload/pg_10/f_jpg,q_auto,c_fill,g_auto,w_800,h_600/v1/calessa/party.GIF');
  });
});
