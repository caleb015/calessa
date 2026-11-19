import React, { useRef } from 'react';
import Link from 'next/link';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '@/app/dashboard/settings/page';
import FloatingSaveButton from '@/components/dashboard/FloatingSaveButton';
import GallerySettingsEditor from '@/components/dashboard/GallerySettingsEditor';
import DetailsPageEditor from '@/components/dashboard/DetailsPageEditor';
import DressCodeSettingsEditor from '@/components/dashboard/DressCodeSettingsEditor';
import { adminApi } from '@/lib/adminApi';
import { LEAVE_MESSAGE, confirmDiscard, confirmLeave } from '@/lib/unsavedChanges';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/dashboard/settings' }));
jest.mock('@/lib/adminApi', () => {
  const fns: Record<string, jest.Mock> = {};
  return { adminApi: new Proxy(fns, { get: (t, k: string) => (t[k] ??= jest.fn().mockResolvedValue({})) }) };
});
const admin = adminApi as unknown as Record<string, jest.Mock>;

/**
 * jsdom can't tell what's on screen; this stand-in lets a test say whether the page's own Save button
 * is visible.
 */
let observers: { callback: IntersectionObserverCallback; el?: Element }[] = [];
function saveButtonOnScreen(visible: boolean) {
  act(() => observers.forEach(o => o.callback([{ isIntersecting: visible, target: o.el } as IntersectionObserverEntry], {} as IntersectionObserver)));
}
beforeEach(() => {
  jest.clearAllMocks();
  observers = [];
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    entry: { callback: IntersectionObserverCallback; el?: Element };
    constructor(callback: IntersectionObserverCallback) { this.entry = { callback }; observers.push(this.entry); }
    observe(el: Element) { this.entry.el = el; }
    disconnect() { observers = observers.filter(o => o !== this.entry); }
  };
});

const SETTINGS = {
  id: 'singleton', createdAt: 'c', updatedAt: 'u', coupleNameA: 'Raissa', coupleNameB: 'Caleb', isPublic: false,
  isRsvpEnabled: true, rsvpHeading: null, rsvpTagline: 'are getting married!', welcomeMessage: 'Hello', homepageGalleryShuffle: false,
};
const floating = () => screen.queryByRole('region', { name: 'Unsaved changes' });

describe('Settings page sections', () => {
  beforeEach(() => admin.getSettings.mockResolvedValue({ ...SETTINGS }));

  it('groups the settings into named sections, with links to each', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const names = ['Site visibility', 'The couple & dates', 'Homepage', 'RSVP page', 'Look & feel', 'Browser tab & sharing', 'Other features'];
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    names.forEach(name => {
      const section = screen.getByRole('region', { name });
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', `#${section.id}`);
    });
  });

  it.each([
    ['Site visibility', [/Site is public/]],
    ['The couple & dates', ['Name A', 'Wedding Date', 'RSVP Deadline']],
    ['Homepage', [/Hero Image URL/, 'Welcome Message', /Welcome Photo/, /RSVP Banner Photo/, /random order/]],
    ['RSVP page', [/RSVP Page Heading/, /RSVP Page Tagline/, /RSVP Page Subtext/, /RSVPs open/, /Maybe/]],
    ['Look & feel', [/Monogram URL/]],
    ['Browser tab & sharing', [/Browser Tab Title/, /Browser Tab Description/]],
    ['Other features', [/guestbook/]],
  ] as [string, (string | RegExp)[]][])('puts the right fields under %s', async (name, fields) => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const section = screen.getByRole('region', { name });
    fields.forEach(f => expect(within(section).getAllByLabelText(f).length).toBeGreaterThan(0));
  });

  it('keeps the theme colours under Look & feel', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const look = screen.getByRole('region', { name: 'Look & feel' });
    ['Background', 'Accent', 'Dark Section Background'].forEach(c => expect(within(look).getByText(c)).toBeInTheDocument());
  });
});

describe('Settings page: saving', () => {
  beforeEach(() => {
    admin.getSettings.mockResolvedValue({ ...SETTINGS });
    admin.updateSettings.mockImplementation(async (body: object) => ({ ...SETTINGS, ...body, updatedAt: 'later' }));
  });

  it('marks unsaved changes, saves only the settings, and clears the mark after saving', async () => {
    render(<SettingsPage />);
    const name = await screen.findByLabelText('Name A');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    await userEvent.type(name, 'h');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ coupleNameA: 'Raissah' })));
    expect(admin.updateSettings.mock.calls[0][0]).not.toHaveProperty('id');
    expect(admin.updateSettings.mock.calls[0][0]).not.toHaveProperty('updatedAt');
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('counts a change undone by hand as no change', async () => {
    render(<SettingsPage />);
    const name = await screen.findByLabelText('Name A');
    await userEvent.type(name, 'h');
    await userEvent.type(name, '{Backspace}');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('floats a Save button only while there are changes and the page\'s own button is out of view', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    saveButtonOnScreen(false);
    expect(floating()).not.toBeInTheDocument(); // nothing changed yet

    await userEvent.click(screen.getByLabelText(/RSVPs open/));
    saveButtonOnScreen(false);
    expect(floating()).toBeInTheDocument();

    saveButtonOnScreen(true); // scrolled down to the page's own Save button
    expect(floating()).not.toBeInTheDocument();
  });

  it('saves from the floating button, which then goes away', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    await userEvent.click(screen.getByLabelText(/RSVPs open/));
    saveButtonOnScreen(false);
    await userEvent.click(within(floating()!).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ isRsvpEnabled: false })));
    await waitFor(() => expect(floating()).not.toBeInTheDocument());
  });

  it('keeps the floating button waiting while a photo uploads', async () => {
    admin.getUploadSignature.mockResolvedValue({ cloudName: 'demo', apiKey: '1', signature: 's', timestamp: 1, folder: 'calessa', allowed_formats: 'jpg' });
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as jest.Mock; // never finishes
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const hero = screen.getByLabelText(/Hero Image URL/).closest('[data-field]') as HTMLElement;
    fireEvent.change(within(hero).getByLabelText('Choose image file'), { target: { files: [new File(['x'], 'h.jpg', { type: 'image/jpeg' })] } });
    await userEvent.type(screen.getByLabelText('Name A'), 'h');
    saveButtonOnScreen(false);
    expect(await within(floating()!).findByRole('button', { name: 'Waiting for upload…' })).toBeDisabled();
  });
});

describe('FloatingSaveButton', () => {
  function Harness({ dirty }: { dirty: boolean }) {
    const ref = useRef<HTMLButtonElement>(null);
    return (
      <>
        <button ref={ref}>Save</button>
        <FloatingSaveButton saveButton={ref} dirty={dirty} onSave={() => {}} />
      </>
    );
  }

  it('never floats where the browser can\'t tell what is on screen', () => {
    delete (global as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    render(<Harness dirty />);
    expect(floating()).not.toBeInTheDocument();
  });

  it('sits clear of the phone\'s bottom edge', () => {
    render(<Harness dirty />);
    saveButtonOnScreen(false);
    expect(floating()).toHaveClass('fixed', 'bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]');
  });
});

describe('Other settings forms float their Save button too', () => {
  const offScreen = async () => { saveButtonOnScreen(false); return within(await waitFor(() => floating()!)).getByRole('button', { name: 'Save changes' }); };

  it('Gallery photo sharing', async () => {
    const settings = { uploadsEnabled: false, requireApproval: true, heading: '', subtext: '', buttonLabel: '', defaults: { heading: 'h', subtext: 's', buttonLabel: 'b' } };
    admin.getGallerySettings.mockResolvedValue(settings);
    admin.updateGallerySettings.mockImplementation(async (body: object) => ({ ...settings, ...body }));
    render(<GallerySettingsEditor />);
    await userEvent.click(await screen.findByLabelText(/Let invited guests upload photos/));
    await userEvent.click(await offScreen());
    await waitFor(() => expect(admin.updateGallerySettings).toHaveBeenCalledWith(expect.objectContaining({ uploadsEnabled: true })));
  });

  it('Details page', async () => {
    const page = { headerEyebrow: '', headerTitle: '', location: '', showAddToCalendar: true, ctaEnabled: true, ctaHeading: '', ctaSubtext: '', ctaButtonLabel: '' };
    admin.getDetailsPage.mockResolvedValue({ page, defaults: {} });
    admin.updateDetailsPage.mockImplementation(async (body: typeof page) => ({ page: body, defaults: {} }));
    render(<DetailsPageEditor />);
    await userEvent.type(await screen.findByLabelText('Location'), 'Antipolo');
    await userEvent.click(await offScreen());
    await waitFor(() => expect(admin.updateDetailsPage).toHaveBeenCalledWith(expect.objectContaining({ location: 'Antipolo' })));
  });

  it('Dress Code', async () => {
    const saved = { enabled: false, eyebrow: '', title: 'The Dress Code', intro: '', palette: [], imageUrls: [] };
    admin.getDressCode.mockResolvedValue(saved);
    admin.updateDressCode.mockImplementation(async (body: typeof saved) => body);
    render(<DressCodeSettingsEditor />);
    await userEvent.click(await screen.findByLabelText('Show on the Details page'));
    await userEvent.click(await offScreen());
    await waitFor(() => expect(admin.updateDressCode).toHaveBeenCalledWith(expect.objectContaining({ enabled: true })));
  });
});

describe('Leaving with unsaved changes', () => {
  let confirmSpy: jest.SpyInstance;
  beforeEach(() => {
    admin.getSettings.mockResolvedValue({ ...SETTINGS });
    admin.updateSettings.mockImplementation(async (body: object) => ({ ...SETTINGS, ...body, updatedAt: 'later' }));
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  });
  afterEach(async () => {
    cleanup();
    await new Promise(r => setTimeout(r, 10)); // let the page tidy its history away before the next test
    confirmSpy.mockRestore();
  });

  /** The Settings page with a dashboard link beside it, as in the sidebar. */
  async function editSettings() {
    render(<><Link href="/dashboard/guests">Guests</Link><SettingsPage /></>);
    await userEvent.type(await screen.findByLabelText('Name A'), 'h');
  }
  const unload = () => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  };
  const clickLink = (name: string) => !fireEvent.click(screen.getByRole('link', { name })); // true if stopped

  it('lets the browser warn before reloading or closing the tab, only while something is unsaved', async () => {
    render(<SettingsPage />);
    const name = await screen.findByLabelText('Name A');
    expect(unload()).toBe(false);
    await userEvent.type(name, 'h');
    expect(unload()).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await screen.findByText('Settings saved.');
    expect(unload()).toBe(false);
  });

  it('asks before following a link to another page, and stays if told to', async () => {
    await editSettings();
    expect(clickLink('Guests')).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith(LEAVE_MESSAGE);
  });

  it('follows the link once leaving is confirmed', async () => {
    confirmSpy.mockReturnValue(true);
    await editSettings();
    expect(clickLink('Guests')).toBe(false);
    expect(unload()).toBe(false); // and doesn't ask a second time on the way out
  });

  it('does not ask for the jump links within the page, which scroll without a Back step', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    await editSettings();
    const push = jest.spyOn(window.history, 'pushState');
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    fireEvent.click(within(nav).getByRole('link', { name: 'Homepage' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(scroll.mock.contexts[0]).toBe(screen.getByRole('region', { name: 'Homepage' }));
    expect(window.location.hash).toBe('#homepage');
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
  });

  it('does not ask when nothing has changed', async () => {
    render(<><Link href="/dashboard/guests">Guests</Link><SettingsPage /></>);
    await screen.findByLabelText('Name A');
    expect(clickLink('Guests')).toBe(false);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('asks on the browser\'s Back button', async () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => {});
    const push = jest.spyOn(window.history, 'pushState');
    try {
      await editSettings();
      expect(push).toHaveBeenCalledTimes(1); // an extra entry for this page, so Back can ask

      act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
      expect(confirmSpy).toHaveBeenCalledWith(LEAVE_MESSAGE);
      expect(push).toHaveBeenCalledTimes(2); // stayed: ready to ask again
      expect(back).not.toHaveBeenCalled();

      confirmSpy.mockReturnValue(true);
      act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
      expect(back).toHaveBeenCalledTimes(1); // carries on back
    } finally {
      back.mockRestore();
      push.mockRestore();
    }
  });

  it('takes the extra Back entry away again once saved', async () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      await editSettings();
      await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
      await screen.findByText('Settings saved.');
      await act(async () => { await new Promise(r => setTimeout(r, 10)); });
      expect(back).toHaveBeenCalledTimes(1);
      act(() => { window.dispatchEvent(new PopStateEvent('popstate')); }); // that step back is ours: no question
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally {
      back.mockRestore();
    }
  });

  it('asks only once when two forms on the page are unsaved', async () => {
    const settings = { uploadsEnabled: false, requireApproval: true, heading: '', subtext: '', buttonLabel: '', defaults: { heading: 'h', subtext: 's', buttonLabel: 'b' } };
    admin.getGallerySettings.mockResolvedValue(settings);
    const saved = { enabled: false, eyebrow: '', title: 'The Dress Code', intro: '', palette: [], imageUrls: [] };
    admin.getDressCode.mockResolvedValue(saved);
    render(<><Link href="/dashboard/guests">Guests</Link><GallerySettingsEditor /><DressCodeSettingsEditor /></>);
    await userEvent.click(await screen.findByLabelText(/Let invited guests upload photos/));
    await userEvent.click(await screen.findByLabelText('Show on the Details page'));
    expect(clickLink('Guests')).toBe(true);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('asks before Logout or switching tabs throws changes away', async () => {
    await editSettings();
    expect(confirmLeave()).toBe(false);
    expect(confirmDiscard()).toBe(false);
    expect(confirmSpy).toHaveBeenLastCalledWith('You have unsaved changes. Discard them?');
    confirmSpy.mockReturnValue(true);
    expect(confirmDiscard()).toBe(true);
  });
});

describe('Settings: hero text placement', () => {
  beforeEach(() => {
    admin.getSettings.mockResolvedValue({ ...SETTINGS, heroTextAlign: null, heroTextOffset: null });
    admin.updateSettings.mockImplementation(async (body: object) => ({ ...SETTINGS, ...body, updatedAt: 'later' }));
  });

  it('sits under Homepage, centred with no offset by default', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const homepage = screen.getByRole('region', { name: 'Homepage' });
    expect(within(homepage).getByLabelText(/Hero Text Alignment/)).toHaveValue('center');
    expect(within(homepage).getByLabelText(/^Hero Text Horizontal Offset/)).toHaveValue('');
    expect(within(homepage).getAllByRole('option').map(o => o.textContent)).toEqual(['Left', 'Centre (default)', 'Right', 'Justify']);
  });

  it('saves an alignment and an offset in pixels or percent', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    await userEvent.selectOptions(screen.getByLabelText(/Hero Text Alignment/), 'left');
    await userEvent.type(screen.getByLabelText(/^Hero Text Horizontal Offset/), '10%');
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ heroTextAlign: 'left', heroTextOffset: '10%' })));
  });

  it('goes back to centred by choosing Centre', async () => {
    admin.getSettings.mockResolvedValue({ ...SETTINGS, heroTextAlign: 'right', heroTextOffset: '40px' });
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    expect(screen.getByLabelText(/Hero Text Alignment/)).toHaveValue('right');
    await userEvent.selectOptions(screen.getByLabelText(/Hero Text Alignment/), 'center');
    await userEvent.clear(screen.getByLabelText(/^Hero Text Horizontal Offset/));
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ heroTextAlign: '', heroTextOffset: '' })));
  });

  it('explains an offset it can\'t use', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    await userEvent.type(screen.getByLabelText(/^Hero Text Horizontal Offset/), '10em');
    expect(screen.getByRole('alert')).toHaveTextContent('Use pixels or a percentage');
    await userEvent.clear(screen.getByLabelText(/^Hero Text Horizontal Offset/));
    await userEvent.type(screen.getByLabelText(/^Hero Text Horizontal Offset/), '-40px');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Settings: hero photo for phones and vertical text position', () => {
  beforeEach(() => {
    admin.getSettings.mockResolvedValue({ ...SETTINGS, heroMobileImageUrl: null, heroTextOffsetY: null });
    admin.updateSettings.mockImplementation(async (body: object) => ({ ...SETTINGS, ...body, updatedAt: 'later' }));
  });

  it('has a phone photo with its own upload box, under Homepage', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const homepage = screen.getByRole('region', { name: 'Homepage' });
    const field = within(homepage).getByLabelText(/Phone Hero Image/).closest('[data-field]') as HTMLElement;
    expect(within(field).getByLabelText('Choose image file')).toBeInTheDocument();
    expect(within(homepage).getByLabelText(/^Hero Text Vertical Offset/)).toBeInTheDocument();
    expect(within(homepage).getByLabelText(/^Phone Hero Vertical Offset/)).toHaveAttribute('min', '-50');
  });

  it('saves a phone-only vertical offset for the text', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    const field = within(screen.getByRole('region', { name: 'Homepage' })).getByLabelText(/^Phone Hero Text Vertical Offset/);
    await userEvent.type(field, '-60px');
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ heroMobileTextOffsetY: '-60px' })));
  });

  it('saves a vertical photo offset for phones', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    await userEvent.type(screen.getByLabelText(/^Phone Hero Vertical Offset/), '-15');
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ heroMobileImageOffsetY: -15 })));
  });

  it('saves a phone photo link and a vertical text offset', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    fireEvent.change(screen.getByLabelText(/Phone Hero Image/), { target: { value: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/phone.jpg' } });
    await userEvent.type(screen.getByLabelText(/^Hero Text Vertical Offset/), '15%');
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(admin.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      heroMobileImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/calessa/phone.jpg', heroTextOffsetY: '15%',
    })));
  });

  it('explains a vertical offset it can\'t use', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText('Name A');
    await userEvent.type(screen.getByLabelText(/^Hero Text Vertical Offset/), '10vh');
    expect(screen.getByRole('alert')).toHaveTextContent('Use pixels or a percentage');
  });
});
