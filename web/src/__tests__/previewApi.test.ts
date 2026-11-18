import { publicApi } from '@/lib/api';
import { PREVIEW_COOKIE, PREVIEW_HEADER } from '@/lib/preview';

// While the site is private, an admin previewing it can look up an invitation and submit an RSVP
// to test the form. That only works if the browser sends the preview token with both requests.

const sentHeaders = (call: number) => ((global.fetch as jest.Mock).mock.calls[call][1]?.headers ?? {}) as Record<string, string>;

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as jest.Mock;
});

afterEach(() => {
  document.cookie = `${PREVIEW_COOKIE}=; Max-Age=0; path=/`;
});

describe('Homepage photos while previewing', () => {
  it('fetches the photos picked for the homepage, sending the preview token', async () => {
    document.cookie = `${PREVIEW_COOKIE}=preview-abc; path=/`;
    await publicApi.getHomepageGallery();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/public\/gallery\/homepage\?offset=0&limit=12$/);
    expect(sentHeaders(0)[PREVIEW_HEADER]).toBe('preview-abc');
  });

  it('asks for later pages with the same shuffle', async () => {
    await publicApi.getHomepageGallery(24, 99);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/public\/gallery\/homepage\?offset=24&limit=12&seed=99$/);
  });
});

describe('RSVP requests while previewing', () => {
  it('send the preview token with the invitation lookup and the RSVP', async () => {
    document.cookie = `${PREVIEW_COOKIE}=preview-abc; path=/`;
    await publicApi.getRsvpByCode('F5YGNM8E');
    await publicApi.submitRsvp('F5YGNM8E', { status: 'ATTENDING', attendeeCount: 1, email: 'a@example.com' });

    expect((global.fetch as jest.Mock).mock.calls[1][0]).toMatch(/\/public\/rsvp\/F5YGNM8E$/);
    expect((global.fetch as jest.Mock).mock.calls[1][1].method).toBe('POST');
    expect(sentHeaders(0)[PREVIEW_HEADER]).toBe('preview-abc');
    expect(sentHeaders(1)[PREVIEW_HEADER]).toBe('preview-abc');
  });

  it('send no preview token for regular visitors', async () => {
    await publicApi.getRsvpByCode('F5YGNM8E');
    await publicApi.submitRsvp('F5YGNM8E', { status: 'ATTENDING', attendeeCount: 1, email: 'a@example.com' });
    expect(sentHeaders(0)).not.toHaveProperty(PREVIEW_HEADER);
    expect(sentHeaders(1)).not.toHaveProperty(PREVIEW_HEADER);
  });
});
