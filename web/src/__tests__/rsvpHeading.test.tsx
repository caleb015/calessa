import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RsvpPage from '@/app/(public)/rsvp/page';
import RsvpEntryPage from '@/components/public/RsvpEntryPage';
import SettingsPage from '@/app/dashboard/settings/page';
import { publicApi } from '@/lib/api';
import { adminApi } from '@/lib/adminApi';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/rsvp',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), publicApi: { getSettings: jest.fn() } }));
jest.mock('@/lib/adminApi', () => ({ adminApi: { getSettings: jest.fn(), updateSettings: jest.fn() } }));

const settings = (over: object) => ({ coupleNameA: 'Caleb', coupleNameB: 'Raissa', rsvpTagline: null, rsvpSubtext: null, ...over });
const heading = () => screen.getByText((_, el) => el?.tagName === 'P' && /mb-2/.test(el.className));

beforeEach(() => jest.clearAllMocks());

describe('RSVP page heading', () => {
  it('says "You\'re Invited" by default', () => {
    render(<RsvpEntryPage />);
    expect(heading()).toHaveTextContent("You're Invited");
  });

  it('uses the heading set in Settings', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ rsvpHeading: 'Join us in Antipolo' }));
    render(await RsvpPage({ searchParams: Promise.resolve({}) }));
    expect(heading()).toHaveTextContent('Join us in Antipolo');
    expect(screen.queryByText("You're Invited")).not.toBeInTheDocument();
  });

  it.each([null, '', '   '])('falls back to "You\'re Invited" when the setting is %p', async value => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ rsvpHeading: value }));
    render(await RsvpPage({ searchParams: Promise.resolve({}) }));
    expect(heading()).toHaveTextContent("You're Invited");
  });

  it('falls back to "You\'re Invited" when settings cannot be loaded', async () => {
    (publicApi.getSettings as jest.Mock).mockRejectedValue(new Error('down'));
    render(await RsvpPage({ searchParams: Promise.resolve({}) }));
    expect(heading()).toHaveTextContent("You're Invited");
  });

  it('can be edited in Dashboard → Settings', async () => {
    (adminApi.getSettings as jest.Mock).mockResolvedValue({ id: 'singleton', coupleNameA: 'Caleb', coupleNameB: 'Raissa', rsvpHeading: null });
    (adminApi.updateSettings as jest.Mock).mockResolvedValue({});
    render(<SettingsPage />);
    const field = await screen.findByLabelText(/RSVP Page Heading/);
    expect(field).toHaveAttribute('placeholder', "You're Invited");
    await userEvent.type(field, 'Join us in Antipolo');
    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(adminApi.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ rsvpHeading: 'Join us in Antipolo' })));
  });
});
