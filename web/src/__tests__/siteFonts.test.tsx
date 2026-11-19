import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FONT_ROLES, fontChoice, googleFontUrl, siteFonts } from '@/lib/fonts';
import { fontFileProblem, fontNameFromFile, uploadFont } from '@/lib/fontUpload';
import SiteFonts, { siteFontStyle } from '@/components/public/SiteFonts';
import FontSettings from '@/components/dashboard/FontSettings';
import SettingsPage from '@/app/dashboard/settings/page';
import PublicLayout from '@/app/(public)/layout';
import RsvpEntryPage from '@/components/public/RsvpEntryPage';
import { adminApi } from '@/lib/adminApi';
import { publicApi } from '@/lib/api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/adminApi', () => {
  const fns: Record<string, jest.Mock> = {};
  return { adminApi: new Proxy(fns, { get: (t, k: string) => (t[k] ??= jest.fn().mockResolvedValue({})) }) };
});
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), publicApi: { getSettings: jest.fn() } }));
const admin = adminApi as unknown as Record<string, jest.Mock>;

const FILE = 'https://res.cloudinary.com/demo/raw/upload/v1/calessa/fonts/slopes.ttf';
const heading = FONT_ROLES.find(r => r.key === 'heading')!;

beforeEach(() => jest.clearAllMocks());

describe('Choosing fonts', () => {
  it('keeps the default when nothing is chosen', () => {
    expect(siteFonts(null)).toEqual({ stylesheets: [], fontFaceCss: '', vars: {} });
    expect(fontChoice({ fontHeading: '  ' }, heading)).toEqual({ kind: 'default' });
  });

  it('loads a Google font by name, with the usual weights and italic', () => {
    expect(googleFontUrl('Cormorant Garamond'))
      .toBe('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    const fonts = siteFonts({ fontHeading: 'Cormorant Garamond', fontBody: 'Jost' });
    expect(fonts.stylesheets).toEqual([googleFontUrl('Cormorant Garamond'), googleFontUrl('Jost')]); // one per family
    expect(fonts.vars).toEqual({ '--font-serif': '"Cormorant Garamond", Georgia, serif', '--font-sans': '"Jost", Arial, sans-serif' });
  });

  it('registers an uploaded font file under its own name, with the right format', () => {
    const fonts = siteFonts({ fontAccent: 'Slopes', fontAccentUrl: FILE, fontBodyUrl: 'https://x.test/a.woff2', fontBody: 'Mine' });
    expect(fonts.fontFaceCss).toContain(`@font-face{font-family:"Calessa Accent";src:url("${FILE}") format("truetype");font-display:swap;}`);
    expect(fonts.fontFaceCss).toContain('format("woff2")');
    expect(fonts.vars['--font-accent']).toBe('"Calessa Accent", cursive');
    expect(fonts.stylesheets).toEqual([]); // uploads don't touch Google Fonts
  });

  it('ignores anything unsafe or malformed, keeping the default', () => {
    const fonts = siteFonts({
      fontHeading: 'Lora; color: red', fontBody: '"Jost"',
      fontAccent: 'X', fontAccentUrl: 'https://x.test/a.ttf"); background:url(evil',
    });
    expect(fonts.vars['--font-serif']).toBeUndefined();
    expect(fonts.vars['--font-sans']).toBeUndefined();
    expect(fonts.fontFaceCss).toBe('');
    // A bad file link with a good name falls back to that name on Google Fonts.
    expect(fonts.vars['--font-accent']).toBe('"X", cursive');
  });

  it('makes body text follow a chosen body font', () => {
    expect(siteFontStyle({ fontBody: 'Jost' })).toMatchObject({ fontFamily: 'var(--font-sans)' });
    expect(siteFontStyle({ fontHeading: 'Lora' })).not.toHaveProperty('fontFamily');
  });
});

describe('On the public site', () => {
  it('loads the chosen fonts and sets them on every page', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue({ coupleNameA: 'R', coupleNameB: 'C', isPublic: true, fontHeading: 'Lora', fontAccent: 'Slopes', fontAccentUrl: FILE });
    const { container } = render(await PublicLayout({ children: <p>Page</p> }));
    expect(document.querySelector(`link[href="${googleFontUrl('Lora')}"]`)).not.toBeNull();
    expect(container.querySelector('style[data-site-fonts]')!.innerHTML).toContain(FILE);
    const wrapper = screen.getByText('Page').closest('div[style]') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--font-serif')).toBe('"Lora", Georgia, serif');
    expect(wrapper.style.getPropertyValue('--font-accent')).toBe('"Calessa Accent", cursive');
  });

  it('uses them on the Under Maintenance page too', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue({ coupleNameA: 'R', coupleNameB: 'C', isPublic: false, preview: false, fontHeading: 'Lora' });
    render(await PublicLayout({ children: <p>Page</p> }));
    expect(screen.getByRole('heading', { name: 'Under Maintenance' }).closest('div[style]')!.getAttribute('style')).toContain('--font-serif');
  });

  it('adds nothing when the defaults are kept', async () => {
    // React moves stylesheets into <head>, where earlier tests' links linger; start clean.
    document.querySelectorAll('link[href*="fonts.googleapis"]').forEach(l => l.remove());
    (publicApi.getSettings as jest.Mock).mockResolvedValue({ coupleNameA: 'R', coupleNameB: 'C', isPublic: true });
    const { container } = render(await PublicLayout({ children: <p>Page</p> }));
    expect(document.querySelector('link[href*="fonts.googleapis"]')).toBeNull();
    expect(container.querySelector('style[data-site-fonts]')).toBeNull();
  });

  it('writes the RSVP code box line in the accent font', () => {
    render(<RsvpEntryPage subtext="My Hoomans are tying the knot!!" />);
    expect(screen.getByText('My Hoomans are tying the knot!!')).toHaveClass('[font-family:var(--font-accent)]');
  });

  it('renders SiteFonts output for uploads', () => {
    const { container } = render(<SiteFonts settings={{ fontHeading: 'Mine', fontHeadingUrl: 'https://x.test/a.otf' }} />);
    expect(container.querySelector('style')!.innerHTML).toContain('format("opentype")');
  });
});

describe('Uploading a font file', () => {
  const file = (name: string, size = 1000) => {
    const f = new File(['x'], name);
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('accepts font files only, up to 5 MB', () => {
    expect(fontFileProblem(file('Slopes.ttf'))).toBeNull();
    expect(fontFileProblem(file('font.WOFF2'))).toBeNull();
    expect(fontFileProblem(file('photo.jpg'))).toMatch(/font file/);
    expect(fontFileProblem(file('huge.otf', 6 * 1024 * 1024))).toMatch(/too large/);
  });

  it('names the font after its file', () => {
    expect(fontNameFromFile('Slopes-Regular.ttf')).toBe('Slopes Regular');
    expect(fontNameFromFile('my_font (v2).woff2')).toBe('my font v2');
    expect(fontNameFromFile('_.ttf')).toBe('Uploaded font');
  });

  it('sends it straight to Cloudinary as a raw file, signed by our API', async () => {
    admin.getFontUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 5, folder: 'calessa/fonts', allowed_formats: 'woff2,woff,ttf,otf' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: FILE }) }) as jest.Mock;
    await expect(uploadFont(file('Slopes.ttf'))).resolves.toBe(FILE);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/raw/upload');
    expect((init.body as FormData).get('folder')).toBe('calessa/fonts');
    expect((init.body as FormData).get('allowed_formats')).toBe('woff2,woff,ttf,otf');
  });

  it('explains a failed upload, and never uploads a non-font', async () => {
    admin.getFontUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 5, folder: 'calessa/fonts', allowed_formats: 'ttf' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Invalid file' } }) }) as jest.Mock;
    await expect(uploadFont(file('a.ttf'))).rejects.toThrow('Upload failed: Invalid file');
    (global.fetch as jest.Mock).mockClear();
    await expect(uploadFont(file('a.exe'))).rejects.toThrow(/font file/);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('Fonts in Dashboard → Settings', () => {
  function Harness({ initial = {} }: { initial?: Record<string, string | null> }) {
    const [form, setForm] = React.useState<Record<string, unknown>>(initial);
    return (
      <>
        <FontSettings form={form} set={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
        <pre data-testid="values">{JSON.stringify(form)}</pre>
      </>
    );
  }
  const values = () => JSON.parse(screen.getByTestId('values').textContent!);
  const card = (label: string) => screen.getByRole('group', { name: label });

  it('shows each font, where it is used, and its default', () => {
    render(<Harness />);
    for (const role of FONT_ROLES) {
      const c = card(role.label);
      expect(within(c).getByText(new RegExp(role.usedFor.slice(0, 20)))).toBeInTheDocument();
      expect(within(c).getByLabelText(`Default (${role.defaultName})`)).toBeChecked();
    }
  });

  it('picks a Google font, with suggestions, and previews it', async () => {
    render(<Harness />);
    const c = card('Headings');
    await userEvent.click(within(c).getByLabelText('Google font'));
    const name = within(c).getByLabelText('Font name');
    expect(c.querySelector('datalist option[value="Cormorant Garamond"]')).not.toBeNull();
    await userEvent.type(name, 'Lora');
    expect(values()).toMatchObject({ fontHeading: 'Lora', fontHeadingUrl: '' });
    expect(screen.getByTestId('font-preview-heading').style.fontFamily).toContain('Lora');
    // The font loads once typing pauses, without a request for each partial name.
    await waitFor(() => expect(c.querySelector(`link[data-font-preview][href="${googleFontUrl('Lora')}"]`)).not.toBeNull());
    expect(c.querySelectorAll('link[data-font-preview]')).toHaveLength(1);
    expect(c.querySelector(`link[href="${googleFontUrl('Lor')}"]`)).toBeNull();
  });

  it('flags a name that can\'t be a font', async () => {
    render(<Harness initial={{ fontBody: 'Jost' }} />);
    await userEvent.type(within(card('Body text')).getByLabelText('Font name'), ';');
    expect(within(card('Body text')).getByRole('alert')).toHaveTextContent(/letters, numbers, spaces and hyphens/);
  });

  it('goes back to the default, clearing the choice', async () => {
    render(<Harness initial={{ fontAccent: 'Slopes', fontAccentUrl: FILE }} />);
    const c = card('Handwritten accent');
    expect(within(c).getByLabelText('Upload a font file')).toBeChecked();
    await userEvent.click(within(c).getByLabelText(/^Default/));
    expect(values()).toMatchObject({ fontAccent: '', fontAccentUrl: '' });
  });

  it('uploads a font file and names it after the file', async () => {
    admin.getFontUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 5, folder: 'calessa/fonts', allowed_formats: 'woff2,woff,ttf,otf' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: FILE }) }) as jest.Mock;
    render(<Harness />);
    const c = card('Handwritten accent');
    await userEvent.click(within(c).getByLabelText('Upload a font file'));
    fireEvent.change(within(c).getByLabelText(/Choose a handwritten accent font file/), { target: { files: [new File(['x'], 'Slopes-Regular.ttf')] } });
    await waitFor(() => expect(values()).toMatchObject({ fontAccentUrl: FILE, fontAccent: 'Slopes Regular' }));
    expect(within(c).getByLabelText('Name (for your reference)')).toHaveValue('Slopes Regular');
    expect(c.querySelector('style')!.innerHTML).toContain(FILE); // previewed
  });

  it('shows why an upload didn\'t work', async () => {
    render(<Harness />);
    const c = card('Body text');
    await userEvent.click(within(c).getByLabelText('Upload a font file'));
    fireEvent.change(within(c).getByLabelText(/Choose a body text font file/), { target: { files: [new File(['x'], 'photo.jpg')] } });
    expect(await within(c).findByRole('alert')).toHaveTextContent(/Please choose a font file/);
    expect(values().fontBodyUrl).toBeUndefined();
  });

  it('has its own section on the Settings page, saved with everything else', async () => {
    admin.getSettings.mockResolvedValue({ id: 's', coupleNameA: 'R', coupleNameB: 'C' });
    admin.updateSettings.mockImplementation(async (b: object) => ({ id: 's', ...b }));
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const section = screen.getByRole('region', { name: 'Fonts' });
    expect(within(screen.getByRole('navigation', { name: 'Settings sections' })).getByRole('link', { name: 'Fonts' })).toHaveAttribute('href', '#fonts');
    const c = within(section).getByRole('group', { name: 'Body text' });
    await userEvent.click(within(c).getByLabelText('Google font'));
    await userEvent.type(within(c).getByLabelText('Font name'), 'Jost');
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ fontBody: 'Jost', fontBodyUrl: '' })));
  });

  it('makes saving wait while a font file uploads', async () => {
    admin.getSettings.mockResolvedValue({ id: 's', coupleNameA: 'R', coupleNameB: 'C' });
    admin.getFontUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 5, folder: 'calessa/fonts', allowed_formats: 'ttf' });
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as jest.Mock;
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const c = within(screen.getByRole('region', { name: 'Fonts' })).getByRole('group', { name: 'Headings' });
    await userEvent.click(within(c).getByLabelText('Upload a font file'));
    fireEvent.change(within(c).getByLabelText(/Choose a headings font file/), { target: { files: [new File(['x'], 'Mine.woff2')] } });
    expect(await screen.findByRole('button', { name: 'Waiting for upload…' })).toBeDisabled();
  });
});
