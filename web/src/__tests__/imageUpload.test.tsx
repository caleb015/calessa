import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImageUploadButton from '@/components/dashboard/ImageUploadButton';
import { adminApi } from '@/lib/adminApi';
import { fitHeightUrl, fitWidthUrl, optimizedImageUrl, thumbnailUrl, uploadImage } from '@/lib/upload';

jest.mock('@/lib/adminApi', () => ({ adminApi: { getUploadSignature: jest.fn() } }));

const SIGNATURE = {
  cloudName: 'demo-cloud', apiKey: '111', signature: 'sig', timestamp: 1700000000,
  folder: 'calessa', allowed_formats: 'jpg,png',
};
const UPLOADED = 'https://res.cloudinary.com/demo-cloud/image/upload/v1/calessa/photo.jpg';
const OPTIMIZED = 'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/photo.jpg';

const image = (name = 'photo.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const mockFetch = (ok: boolean, body: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }) as jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  (adminApi.getUploadSignature as jest.Mock).mockResolvedValue(SIGNATURE);
});

describe('uploadImage', () => {
  it('sends the signed upload to Cloudinary and returns the optimized URL', async () => {
    mockFetch(true, { secure_url: UPLOADED });
    await expect(uploadImage(image())).resolves.toBe(OPTIMIZED);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    const form = init.body as FormData;
    expect(form.get('api_key')).toBe('111');
    expect(form.get('signature')).toBe('sig');
    expect(form.get('timestamp')).toBe('1700000000');
    expect(form.get('folder')).toBe('calessa');
    expect(form.get('allowed_formats')).toBe('jpg,png');
  });

  it('rejects non-images and oversized files before uploading', async () => {
    mockFetch(true, {});
    await expect(uploadImage(image('notes.pdf', 'application/pdf'))).rejects.toThrow('Please choose an image file.');
    await expect(uploadImage(image('big.jpg', 'image/jpeg', 11 * 1024 * 1024))).rejects.toThrow(/too large/);
    expect(adminApi.getUploadSignature).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('accepts iPhone HEIC photos even without a MIME type', async () => {
    mockFetch(true, { secure_url: UPLOADED });
    await expect(uploadImage(image('IMG_0001.HEIC', ''))).resolves.toBe(OPTIMIZED);
  });

  it("surfaces Cloudinary's error message", async () => {
    mockFetch(false, { error: { message: 'Invalid Signature' } });
    await expect(uploadImage(image())).rejects.toThrow('Upload failed: Invalid Signature');
  });

  it('makes small square thumbnails of uploaded images only', () => {
    expect(thumbnailUrl(OPTIMIZED)).toBe('https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_fill,w_96,h_96/v1/calessa/photo.jpg');
    expect(thumbnailUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('scales Cloudinary images to a width or height without cropping, and leaves other links alone', () => {
    expect(fitWidthUrl(OPTIMIZED, 1600)).toBe('https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_1600/v1/calessa/photo.jpg');
    expect(fitHeightUrl(OPTIMIZED, 384)).toBe('https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,h_384/v1/calessa/photo.jpg');
    for (const other of ['https://example.com/a.jpg', UPLOADED]) {
      expect(fitWidthUrl(other, 1600)).toBe(other);
      expect(fitHeightUrl(other, 384)).toBe(other);
    }
  });

  it('leaves non-Cloudinary URLs alone when optimizing', () => {
    expect(optimizedImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });
});

describe('ImageUploadButton', () => {
  it('passes the uploaded URL back', async () => {
    mockFetch(true, { secure_url: UPLOADED });
    const onUploaded = jest.fn();
    render(<ImageUploadButton onUploaded={onUploaded} />);
    fireEvent.change(screen.getByLabelText('Choose image file'), { target: { files: [image()] } });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(OPTIMIZED));
    expect(screen.getByRole('button', { name: /Upload image/ })).not.toBeDisabled();
  });

  it('uploads several files, keeps the good ones and names the one that failed', async () => {
    let n = 0;
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ secure_url: `https://res.cloudinary.com/demo-cloud/image/upload/v1/calessa/p${++n}.jpg` }),
    })) as jest.Mock;
    const onUploaded = jest.fn();
    const onBusyChange = jest.fn();
    render(<ImageUploadButton multiple onUploaded={onUploaded} onBusyChange={onBusyChange} />);
    fireEvent.change(screen.getByLabelText('Choose image files'), {
      target: { files: [image('one.jpg'), image('huge.jpg', 'image/jpeg', 11 * 1024 * 1024), image('three.jpg')] },
    });

    expect(await screen.findByText(/huge\.jpg: Image is too large/)).toBeInTheDocument();
    expect(onUploaded.mock.calls.map(c => c[0])).toEqual([
      'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/p1.jpg',
      'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/p2.jpg',
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2); // the oversized file never left the browser
    expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
    expect(screen.getByRole('button', { name: /Upload images/ })).toBeEnabled();
  });

  it('shows progress while several files upload', async () => {
    const pending: Array<() => void> = [];
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => {
      pending.push(() => resolve({ ok: true, json: async () => ({ secure_url: UPLOADED }) }));
    })) as jest.Mock;
    render(<ImageUploadButton multiple onUploaded={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Choose image files'), { target: { files: [image('a.jpg'), image('b.jpg')] } });

    expect(await screen.findByRole('button', { name: /Uploading 1 of 2…/ })).toBeDisabled();
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0]();
    expect(await screen.findByRole('button', { name: /Uploading 2 of 2…/ })).toBeDisabled();
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1]();
    expect(await screen.findByRole('button', { name: /Upload images/ })).toBeEnabled();
  });

  it('shows the error when uploads are not set up', async () => {
    (adminApi.getUploadSignature as jest.Mock).mockRejectedValue(
      new Error('Image uploads are not configured: CLOUDINARY_URL is not set on the API.'),
    );
    const onUploaded = jest.fn();
    render(<ImageUploadButton onUploaded={onUploaded} />);
    fireEvent.change(screen.getByLabelText('Choose image file'), { target: { files: [image()] } });
    expect(await screen.findByText(/CLOUDINARY_URL is not set/)).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
