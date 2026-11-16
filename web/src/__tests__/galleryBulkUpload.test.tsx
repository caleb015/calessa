import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentPage from '@/app/dashboard/content/page';
import { adminApi } from '@/lib/adminApi';

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

const CLD = (name: string) => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${name}.jpg`;
const file = (name: string, size = 1000) => {
  const f = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

beforeEach(() => {
  jest.clearAllMocks();
  admin.getGallery.mockResolvedValue([
    { id: 'a', imageUrl: CLD('a'), title: 'Old one', isPublished: true, displayOrder: 0, guest: null },
    { id: 'b', imageUrl: CLD('b'), title: 'Old two', isPublished: true, displayOrder: 4, guest: null },
  ]);
  admin.getGallerySettings.mockResolvedValue({ uploadsEnabled: true, requireApproval: true, heading: '', subtext: '', buttonLabel: '', defaults: { heading: '', subtext: '', buttonLabel: '' } });
  admin.getUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa', allowed_formats: 'jpg' });
  admin.createGalleryImage.mockImplementation(async (body: { imageUrl: string }) => ({ id: body.imageUrl, title: null, guest: null, ...body }));
  // Cloudinary hands back a link named after the file ("one.jpg" → …/one.jpg).
  global.fetch = jest.fn().mockImplementation(async (_url: string, init: { body: FormData }) => ({
    ok: true,
    json: async () => ({ secure_url: `https://res.cloudinary.com/demo/image/upload/v1/calessa/${(init.body.get('file') as File).name}` }),
  })) as jest.Mock;
});

async function openGallery() {
  render(<ContentPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
  await screen.findByText('Old one');
}

describe('Gallery: upload several photos at once', () => {
  it('adds each photo as its own published item after the existing ones, in the order chosen, skipping files that fail', async () => {
    await openGallery();
    fireEvent.change(screen.getByLabelText('Choose image files'), {
      target: { files: [file('one.jpg'), file('huge.jpg', 11 * 1024 * 1024), file('three.jpg')] },
    });

    expect(await screen.findByRole('status')).toHaveTextContent('2 photos added to the gallery.');
    // Several upload at once, so they can finish in any order; each keeps its place in the selection.
    const created = admin.createGalleryImage.mock.calls.map(c => c[0]).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(created).toEqual([
      { imageUrl: CLD('one'), isPublished: true, displayOrder: 5 },
      { imageUrl: CLD('three'), isPublished: true, displayOrder: 7 },
    ]);
    expect(screen.getByText(/huge\.jpg: Image is too large/)).toBeInTheDocument();
    expect(screen.getByText('4 items')).toBeInTheDocument();
    expect(await screen.findByText(CLD('one'))).toBeInTheDocument(); // listed (untitled items show their link)
  });

  it('starts at the beginning of an empty gallery', async () => {
    admin.getGallery.mockResolvedValue([]);
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Gallery' }));
    fireEvent.change(await screen.findByLabelText('Choose image files'), { target: { files: [file('one.jpg')] } });
    await waitFor(() => expect(admin.createGalleryImage).toHaveBeenCalledWith({ imageUrl: CLD('one'), isPublished: true, displayOrder: 0 }));
    expect(await screen.findByRole('status')).toHaveTextContent('1 photo added to the gallery.');
  });

  it('says so when a photo uploaded but could not be added', async () => {
    admin.createGalleryImage.mockRejectedValueOnce(new Error('Server error'));
    await openGallery();
    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [file('one.jpg'), file('two.jpg')] } });
    expect(await screen.findByText("Uploaded, but couldn't add a photo: Server error")).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('1 photo added to the gallery.');
  });

  it('only offers it on the Gallery tab', async () => {
    render(<ContentPage />);
    await screen.findByRole('button', { name: /\+ Add event/ });
    expect(screen.queryByRole('button', { name: 'Upload photos' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Gallery' }));
    expect(await screen.findByRole('button', { name: 'Upload photos' })).toBeInTheDocument();
  });
});
