import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DressCode from '@/components/public/details/DressCode';
import ContentPage from '@/app/dashboard/content/page';
import { adminApi } from '@/lib/adminApi';
import { fitHeightUrl, fitWidthUrl } from '@/lib/upload';

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

const CLD = (id: string) => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${id}.jpg`;

describe('Dress code outfit photos on the Details page', () => {
  const dressCode = (imageUrls: string[]) => ({
    eyebrow: null, title: 'The Dress Code', intro: null, palette: [],
    guidelines: [{ id: 'g1', label: 'For the Ladies', text: 'Maxi dresses', note: null, imageUrls }],
  });

  it('spans the full width with a single photo, shown whole', () => {
    render(<DressCode dressCode={dressCode([CLD('a')])} />);
    const img = screen.getByRole('button', { name: 'For the Ladies outfit idea 1 of 1' }).querySelector('img')!;
    expect(img).toHaveAttribute('src', fitWidthUrl(CLD('a'), 1600)); // scaled, never cropped
    expect(img).toHaveClass('w-full', 'h-auto');
    expect(img).not.toHaveClass('object-cover');
    expect(img.closest('.grid')).toHaveClass('grid-cols-1');
    expect(img.closest('.grid')).not.toHaveClass('sm:grid-cols-2');
  });

  it('puts several photos in two full-width columns and opens them full size', async () => {
    render(<DressCode dressCode={dressCode([CLD('a'), CLD('b')])} />);
    const first = screen.getByRole('button', { name: 'For the Ladies outfit idea 1 of 2' });
    const thumb = first.querySelector('img')!;
    expect(thumb).toHaveAttribute('src', fitWidthUrl(CLD('a'), 1000));
    expect(thumb.closest('.grid')).toHaveClass('sm:grid-cols-2');

    await userEvent.click(first);
    const dialog = screen.getByRole('dialog', { name: 'For the Ladies outfit ideas' });
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', CLD('a'));
    expect(dialog).toHaveTextContent('1 of 2');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', CLD('b'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', CLD('a'));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows nothing extra for guidelines without photos', () => {
    render(<DressCode dressCode={dressCode([])} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Dress code guideline editor', () => {
  const guideline = { id: 'g1', label: 'For the Ladies', text: 'Maxi dresses', note: null, displayOrder: 0, imageUrls: [CLD('old')], createdAt: 'x', updatedAt: 'x' };

  beforeEach(() => {
    jest.clearAllMocks();
    admin.getDressCode.mockResolvedValue({ enabled: true, eyebrow: '', title: '', intro: '', palette: [] });
    admin.getDressCodeGuidelines.mockResolvedValue([guideline]);
    admin.updateDressCodeGuideline.mockImplementation(async (id: string, body: object) => ({ ...guideline, ...body }));
    admin.getUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa', allowed_formats: 'jpg' });
  });

  async function openGuideline() {
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dress Code' }));
    expect(await screen.findByRole('img', { name: 'For the Ladies photo 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
  }

  it('uploads several photos at once, adds links, reorders, removes and saves them', async () => {
    let n = 0;
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ secure_url: `https://res.cloudinary.com/demo/image/upload/v1/calessa/new${++n}.jpg` }),
    })) as jest.Mock;
    await openGuideline();

    const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [file('a.jpg'), file('b.jpg')] } });
    await waitFor(() => expect(screen.getAllByRole('img', { name: /^Photo \d$/ })).toHaveLength(3));

    await userEvent.type(screen.getByLabelText('Image link'), 'not a link');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText(/full web link/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Image link'));
    await userEvent.type(screen.getByLabelText('Image link'), 'https://example.com/look.png{Enter}');

    await userEvent.click(screen.getByRole('button', { name: 'Remove photo 1' })); // the old one
    await userEvent.click(screen.getByRole('button', { name: 'Move photo 3 left' })); // the link before new2
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(admin.updateDressCodeGuideline).toHaveBeenCalled());
    const [id, body] = admin.updateDressCodeGuideline.mock.calls[0];
    expect(id).toBe('g1');
    expect(body.imageUrls).toEqual([CLD('new1'), 'https://example.com/look.png', CLD('new2')]);
    expect(Object.keys(body).sort()).toEqual(['displayOrder', 'imageUrls', 'label', 'note', 'text']);

    // After saving, the row shows every saved photo, in the saved order.
    const strip = await screen.findByRole('list', { name: 'Photos for For the Ladies' });
    expect(within(strip).getAllByRole('img').map(i => i.getAttribute('src'))).toEqual([
      fitHeightUrl(CLD('new1'), 384), 'https://example.com/look.png', fitHeightUrl(CLD('new2'), 384),
    ]);
  });

  it('waits for a running upload before saving, so the photo is not lost', async () => {
    let finish!: () => void;
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => {
      finish = () => resolve({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/big.jpg' }) });
    })) as jest.Mock;
    await openGuideline();

    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [new File(['x'], 'big.jpg', { type: 'image/jpeg' })] } });
    const save = await screen.findByRole('button', { name: 'Waiting for upload…' });
    expect(save).toBeDisabled();
    await userEvent.click(save);
    expect(admin.updateDressCodeGuideline).not.toHaveBeenCalled();

    finish();
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(admin.updateDressCodeGuideline).toHaveBeenCalled());
    expect(admin.updateDressCodeGuideline.mock.calls[0][1].imageUrls).toEqual([CLD('old'), CLD('big')]);
  });

  it('drops an upload that finishes after the form was cancelled', async () => {
    let finish!: () => void;
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => {
      finish = () => resolve({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/late.jpg' }) });
    })) as jest.Mock;
    await openGuideline();
    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [new File(['x'], 'late.jpg', { type: 'image/jpeg' })] } });
    await screen.findByRole('button', { name: 'Waiting for upload…' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    finish();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getAllByRole('img', { name: /^Photo \d$/ })).toHaveLength(1); // only the saved one
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('ignores a photo that is already in the list', async () => {
    await openGuideline();
    await userEvent.type(screen.getByLabelText('Image link'), `${CLD('old')}{Enter}`);
    expect(screen.getAllByRole('img', { name: /^Photo \d$/ })).toHaveLength(1);
  });

  it('adds a new guideline with photos', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/kids.jpg' }),
    }) as jest.Mock;
    admin.createDressCodeGuideline.mockImplementation(async (body: object) => ({ id: 'g2', note: null, displayOrder: 0, ...body }));
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dress Code' }));
    await userEvent.click(await screen.findByRole('button', { name: '+ Add guideline' }));

    await userEvent.type(screen.getByPlaceholderText('e.g. For the Ladies'), 'For the Kids');
    await userEvent.type(screen.getByPlaceholderText(/Elegant maxi/), 'Comfy and colorful');
    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [new File(['x'], 'kids.jpg', { type: 'image/jpeg' })] } });
    await screen.findByRole('img', { name: 'Photo 1' });
    await userEvent.click(screen.getByRole('button', { name: 'Add guideline' }));

    await waitFor(() => expect(admin.createDressCodeGuideline).toHaveBeenCalledWith({
      label: 'For the Kids', text: 'Comfy and colorful', imageUrls: [CLD('kids')],
    }));
    const strip = await screen.findByRole('list', { name: 'Photos for For the Kids' });
    expect(within(strip).getByRole('img')).toHaveAttribute('src', fitHeightUrl(CLD('kids'), 384));
  });

  it('stops at 12 photos', async () => {
    admin.getDressCodeGuidelines.mockResolvedValue([{ ...guideline, imageUrls: Array.from({ length: 12 }, (_, i) => CLD(`p${i}`)) }]);
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dress Code' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: /Upload images/ })).toBeDisabled();
    expect(screen.getByText(/12 of 12 photos — remove one to add more/)).toBeInTheDocument();
  });
});

describe('Single image fields (Story)', () => {
  const story = { id: 's1', title: 'We Met', dateLabel: '2019', description: '', imageUrl: '', displayOrder: 0, isPublished: true };

  beforeEach(() => {
    jest.clearAllMocks();
    admin.getStoryTimeline.mockResolvedValue([story]);
    admin.updateStoryItem.mockImplementation(async (id: string, body: object) => ({ ...story, ...body }));
    admin.getUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa', allowed_formats: 'jpg' });
  });

  it('waits for the upload before saving, then saves the uploaded image', async () => {
    let finish!: () => void;
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => {
      finish = () => resolve({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/met.jpg' }) });
    })) as jest.Mock;
    render(<ContentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Story' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    fireEvent.change(screen.getByLabelText('Choose image file'), { target: { files: [new File(['x'], 'met.jpg', { type: 'image/jpeg' })] } });
    const save = await screen.findByRole('button', { name: 'Waiting for upload…' });
    expect(save).toBeDisabled();
    await userEvent.click(save);
    expect(admin.updateStoryItem).not.toHaveBeenCalled();

    finish();
    expect(await screen.findByDisplayValue(CLD('met'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(admin.updateStoryItem).toHaveBeenCalledWith('s1', expect.objectContaining({ imageUrl: CLD('met') })));
  });
});
