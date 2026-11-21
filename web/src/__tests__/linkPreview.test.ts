import { existsSync } from 'fs';
import { join } from 'path';
import { generateMetadata } from '@/app/layout';
import { LINK_PREVIEW_IMAGE } from '@/lib/linkPreview';
import { publicApi } from '@/lib/api';

jest.mock('next/font/google', () => {
  const font = () => ({ variable: 'font' });
  return { Geist: font, Geist_Mono: font, Playfair_Display: font };
});
jest.mock('@/lib/api', () => ({ publicApi: { getSettings: jest.fn() } }));
const getSettings = publicApi.getSettings as jest.Mock;

beforeEach(() => getSettings.mockReset());

describe('Link previews (Messenger, Facebook, iMessage…)', () => {
  it('has the preview picture in the site\'s files', () => {
    expect(LINK_PREVIEW_IMAGE).toBe('/images/link-preview.jpg');
    expect(existsSync(join(__dirname, '../../public', LINK_PREVIEW_IMAGE))).toBe(true);
  });

  it('shows the preview picture, the couple and the Browser Tab title and description', async () => {
    getSettings.mockResolvedValue({
      coupleNameA: 'Raissa', coupleNameB: 'Caleb',
      siteTitle: 'Raissa & Caleb · February 12, 2027', siteDescription: 'Join us in Antipolo.',
    });
    const meta = await generateMetadata();
    expect(meta.title).toBe('Raissa & Caleb · February 12, 2027');
    expect(meta.description).toBe('Join us in Antipolo.');
    expect(meta.openGraph).toMatchObject({
      type: 'website', siteName: 'Raissa & Caleb', title: 'Raissa & Caleb · February 12, 2027', description: 'Join us in Antipolo.',
      images: [{ url: LINK_PREVIEW_IMAGE, width: 1200, height: 630, alt: 'Raissa & Caleb' }],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [LINK_PREVIEW_IMAGE] });
    // The site's own picture becomes a full link for the crawlers.
    expect(meta.metadataBase?.toString()).toBe('https://raissaandcaleb.com/');
  });

  it('falls back to the usual title and description when Settings leave them empty', async () => {
    getSettings.mockResolvedValue({ coupleNameA: 'Raissa', coupleNameB: 'Caleb', siteTitle: '  ', siteDescription: null });
    const meta = await generateMetadata();
    expect(meta.title).toBe(process.env.NEXT_PUBLIC_APP_NAME || 'Caleb & Raissa');
    expect(meta.description).toBe('Join us as we celebrate our wedding day.');
  });

  it('still gives a preview while the site is private (the tags come with every page, Under Maintenance included)', async () => {
    getSettings.mockResolvedValue({ isPublic: false, coupleNameA: 'Raissa', coupleNameB: 'Caleb' });
    const meta = await generateMetadata();
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: LINK_PREVIEW_IMAGE })]);
  });

  it('still gives a preview if the settings can\'t be loaded', async () => {
    getSettings.mockRejectedValue(new Error('down'));
    const meta = await generateMetadata();
    expect(meta.openGraph).toMatchObject({ siteName: 'Caleb & Raissa', images: [expect.objectContaining({ url: LINK_PREVIEW_IMAGE })] });
  });
});
