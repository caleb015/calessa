import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RsvpForm from '@/components/public/RsvpForm';
import { publicApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  publicApi: { submitRsvp: jest.fn() },
}));

const guest = {
  id: 'g1', primaryName: 'Caleb Test', email: 'caleb@example.com', phone: null,
  allowedPartySize: 1, plusOneAllowed: false, requiresMealSelection: false, rsvp: null,
};
const settings = { allowMaybe: false, enableMealPreference: false, enableSongRequest: false };

beforeEach(() => {
  (publicApi.submitRsvp as jest.Mock).mockResolvedValue({ id: 'r1', status: 'ATTENDING' });
});

describe('After submitting an RSVP', () => {
  it('invites attending guests on to the homepage', async () => {
    render(<RsvpForm code="F5YGNM8E" guest={guest} settings={settings} />);
    await userEvent.click(screen.getByRole('button', { name: /Submit RSVP/i }));

    expect(await screen.findByText('See you there!')).toBeInTheDocument();
    expect(screen.getByText(/details, schedule and more on our wedding website/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the homepage' })).toHaveAttribute('href', '/');
  });

  it('invites guests who decline to the homepage too', async () => {
    render(<RsvpForm code="F5YGNM8E" guest={guest} settings={settings} />);
    await userEvent.click(screen.getByRole('button', { name: /Regretfully Decline/i }));
    await userEvent.click(screen.getByRole('button', { name: /Submit RSVP/i }));

    expect(await screen.findByText("We'll miss you!")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the homepage' })).toHaveAttribute('href', '/');
  });

  it('shows no link while the form is still being filled in', () => {
    render(<RsvpForm code="F5YGNM8E" guest={guest} settings={settings} />);
    expect(screen.queryByRole('link', { name: 'Go to the homepage' })).not.toBeInTheDocument();
  });
});
