import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuestPhotoUpload from '@/components/public/GuestPhotoUpload';
import GalleryShareCard from '@/components/public/GalleryShareCard';
import GalleryGrid from '@/components/public/GalleryGrid';
import GallerySettingsEditor from '@/components/dashboard/GallerySettingsEditor';
import ContentPage from '@/app/dashboard/content/page';
import { ApiError, publicApi } from '@/lib/api';
import { adminApi } from '@/lib/adminApi';

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/content',
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    publicApi: {
      verifyGalleryCode: jest.fn(),
      getGalleryUploadSignature: jest.fn(),
      addGalleryUploads: jest.fn(),
    },
  };
});

// Every admin API call resolves to [] unless a test says otherwise.
jest.mock('@/lib/adminApi', () => {
  const fns: Record<string, jest.Mock> = {};
  return {
    adminApi: new Proxy(fns, {
      get: (target, key: string) => (target[key] ??= jest.fn().mockResolvedValue([])),
    }),
  };
});

const pub = publicApi as unknown as Record<string, jest.Mock>;
const admin = adminApi as unknown as Record<string, jest.Mock>;

const SIG = { cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa/guest-uploads', allowed_formats: 'jpg' };
const photo = (name: string, type = 'image/jpeg', size = 1000) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const cloudinaryOk = (publicId: string) => ({
  ok: true,
  json: () => Promise.resolve({ secure_url: `https://res.cloudinary.com/demo/image/upload/v9/${publicId}.jpg`, public_id: publicId, version: 9, signature: 'f'.repeat(40), format: 'jpg' }),
});

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:preview');
  global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear(); // codes are remembered between visits
  mockSearchParams = new URLSearchParams();
  pub.verifyGalleryCode.mockResolvedValue({ name: 'Maria Santos' });
  pub.getGalleryUploadSignature.mockResolvedValue(SIG);
});

async function signIn(code = 'ABC123') {
  render(<GuestPhotoUpload />);
  await userEvent.type(screen.getByLabelText(/invitation code/i), code);
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Maria Santos');
}

describe('GuestPhotoUpload', () => {
  it('asks for the invitation code and greets the guest by name', async () => {
    await signIn();
    expect(pub.verifyGalleryCode).toHaveBeenCalledWith('ABC123');
    expect(screen.getByRole('button', { name: /Choose photos/ })).toBeInTheDocument();
  });

  it('explains an unknown code', async () => {
    pub.verifyGalleryCode.mockRejectedValue(new ApiError(404, 'Invitation code not found'));
    render(<GuestPhotoUpload />);
    await userEvent.type(screen.getByLabelText(/invitation code/i), 'WRONG');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't find that invitation code");
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
  });

  it('signs in straight away from a ?code= link', async () => {
    mockSearchParams = new URLSearchParams({ code: 'ABC123' });
    render(<GuestPhotoUpload />);
    expect(await screen.findByText('Maria Santos')).toBeInTheDocument();
    expect(pub.verifyGalleryCode).toHaveBeenCalledWith('ABC123');
  });

  it('uploads several photos at once and adds them to the gallery (pending approval)', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(cloudinaryOk('calessa/guest-uploads/a'))
      .mockResolvedValueOnce(cloudinaryOk('calessa/guest-uploads/b')) as jest.Mock;
    pub.addGalleryUploads.mockResolvedValue({ added: 2, pendingApproval: true });
    await signIn();

    fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [photo('a.jpg'), photo('b.jpg')] } });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Share 2 photos' }));

    await waitFor(() => expect(pub.addGalleryUploads).toHaveBeenCalled());
    const [code, images] = pub.addGalleryUploads.mock.calls[0];
    expect(code).toBe('ABC123');
    expect(images.map((i: { publicId: string }) => i.publicId).sort()).toEqual(['calessa/guest-uploads/a', 'calessa/guest-uploads/b']);
    expect(images[0]).toMatchObject({ version: 9, format: 'jpg', signature: 'f'.repeat(40) });

    expect(await screen.findByRole('status')).toHaveTextContent('2 photos will appear in the gallery once the couple has had a look');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('says photos are live when approval is off', async () => {
    global.fetch = jest.fn().mockResolvedValue(cloudinaryOk('calessa/guest-uploads/a')) as jest.Mock;
    pub.addGalleryUploads.mockResolvedValue({ added: 1, pendingApproval: false });
    await signIn();
    fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [photo('a.jpg')] } });
    await userEvent.click(screen.getByRole('button', { name: 'Share 1 photo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('1 photo is now in the gallery');
  });

  it('marks files that cannot be uploaded and skips them', async () => {
    global.fetch = jest.fn().mockResolvedValue(cloudinaryOk('calessa/guest-uploads/ok')) as jest.Mock;
    pub.addGalleryUploads.mockResolvedValue({ added: 1, pendingApproval: true });
    await signIn();
    fireEvent.change(screen.getByLabelText('Choose photos'), {
      target: { files: [photo('ok.jpg'), photo('notes.pdf', 'application/pdf'), photo('huge.jpg', 'image/jpeg', 11 * 1024 * 1024)] },
    });
    expect(screen.getByText('Please choose an image file.')).toBeInTheDocument();
    expect(screen.getByText(/too large/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Share 1 photo' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('keeps failed photos so they can be retried', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(cloudinaryOk('calessa/guest-uploads/a'))
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: { message: 'Network glitch' } }) })
      .mockResolvedValueOnce(cloudinaryOk('calessa/guest-uploads/b')) as jest.Mock;
    pub.addGalleryUploads.mockResolvedValue({ added: 1, pendingApproval: true });
    await signIn();
    fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [photo('a.jpg'), photo('b.jpg')] } });
    await userEvent.click(screen.getByRole('button', { name: 'Share 2 photos' }));

    expect(await screen.findByText('Upload failed: Network glitch')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Share 1 photo' }));
    await waitFor(() => expect(pub.addGalleryUploads).toHaveBeenCalledTimes(2));
  });

  it('limits a batch to 30 photos', async () => {
    await signIn();
    const many = Array.from({ length: 32 }, (_, i) => photo(`p${i}.jpg`));
    fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: many } });
    expect(screen.getAllByRole('listitem')).toHaveLength(30);
    expect(screen.getByRole('alert')).toHaveTextContent('up to 30 photos at a time');
  });
});

describe('Gallery page pieces', () => {
  it('share card uses the wording from the dashboard and links to the upload page', () => {
    render(<GalleryShareCard settings={{ uploadsEnabled: true, requireApproval: true, heading: 'Show us your photos!', subtext: 'Use your code.', buttonLabel: 'Upload photos' }} />);
    expect(screen.getByRole('heading', { name: 'Show us your photos!' })).toBeInTheDocument();
    expect(screen.getByText('Use your code.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upload photos/ })).toHaveAttribute('href', '/gallery/upload');
  });

  it('credits guest photos in the gallery viewer', async () => {
    render(<GalleryGrid images={[{ id: '1', title: null, description: null, imageUrl: 'a.jpg', displayOrder: 0, sharedBy: 'Maria Santos' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Photo shared by Maria Santos' }));
    expect(screen.getByText('Shared by Maria Santos')).toBeInTheDocument();
  });
});

describe('Dashboard gallery', () => {
  const settings = {
    uploadsEnabled: true, requireApproval: true, heading: '', subtext: '', buttonLabel: '',
    defaults: { heading: 'Share your best memories with us', subtext: 'Use your code', buttonLabel: 'Share your photos' },
  };

  it('edits guest sharing settings, sending only the settings fields', async () => {
    admin.getGallerySettings.mockResolvedValue(settings);
    admin.updateGallerySettings.mockImplementation(async (body: object) => ({ ...settings, ...body }));
    render(<GallerySettingsEditor />);

    expect(await screen.findByLabelText('Heading')).toHaveAttribute('placeholder', 'Share your best memories with us');
    await userEvent.click(screen.getByLabelText(/Approve guest photos/));
    await userEvent.type(screen.getByLabelText('Button label'), 'Upload yours');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(admin.updateGallerySettings).toHaveBeenCalledWith({
      uploadsEnabled: true, requireApproval: false, heading: '', subtext: '', buttonLabel: 'Upload yours',
    }));
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
  });

  it('lists pending guest photos and publishes them in one click', async () => {
    admin.getGallerySettings.mockResolvedValue(settings);
    admin.getGallery.mockResolvedValue([
      { id: 'g1', imageUrl: 'https://x/a.jpg', title: null, isPublished: false, guest: { primaryName: 'Maria Santos' } },
      { id: 'g2', imageUrl: 'https://x/b.jpg', title: 'Our trip', isPublished: true, guest: null },
    ]);
    admin.updateGalleryImage.mockResolvedValue({ id: 'g1', imageUrl: 'https://x/a.jpg', title: null, isPublished: true, guest: { primaryName: 'Maria Santos' } });
    render(<ContentPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    const row = (await screen.findByText('Photo from Maria Santos')).closest('div.bg-white') as HTMLElement;
    expect(within(row).getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Publish' })).toHaveLength(1); // only the unpublished one

    await userEvent.click(within(row).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(admin.updateGalleryImage).toHaveBeenCalledWith('g1', { isPublished: true }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument());
    expect(screen.queryByText('Pending approval')).not.toBeInTheDocument();
  });
});
