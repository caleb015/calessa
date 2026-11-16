import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DetailsPageEditor from '@/components/dashboard/DetailsPageEditor';
import DressCodeSettingsEditor from '@/components/dashboard/DressCodeSettingsEditor';

jest.mock('@/lib/adminApi', () => ({
  adminApi: {
    getDetailsPage: jest.fn(),
    updateDetailsPage: jest.fn(),
    getDressCode: jest.fn(),
    updateDressCode: jest.fn(),
  },
}));

import { adminApi } from '@/lib/adminApi';
const api = adminApi as unknown as Record<string, jest.Mock>;

const blankPage = {
  headerEyebrow: '', headerTitle: '', location: '', showAddToCalendar: true,
  ctaEnabled: true, ctaHeading: '', ctaSubtext: '', ctaButtonLabel: '',
};
const defaults = { headerEyebrow: 'The Wedding', headerTitle: 'Details', ctaHeading: 'Want to see the Full Day?', ctaSubtext: 'x', ctaButtonLabel: "View the Day's Schedule" };

describe('DetailsPageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getDetailsPage.mockResolvedValue({ page: blankPage, defaults });
    api.updateDetailsPage.mockImplementation(async (body: typeof blankPage) => ({ page: body, defaults }));
  });

  it('shows defaults as placeholders and saves edits', async () => {
    render(<DetailsPageEditor />);
    const eyebrow = await screen.findByLabelText('Eyebrow');
    expect(eyebrow).toHaveAttribute('placeholder', 'The Wedding');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Location'), 'Antipolo, Rizal');
    await userEvent.click(screen.getByLabelText(/Show the call to action/));
    await userEvent.click(save);

    expect(api.updateDetailsPage).toHaveBeenCalledWith({ ...blankPage, location: 'Antipolo, Rizal', ctaEnabled: false });
    expect(await screen.findByText('Details page saved.')).toBeInTheDocument();
  });
});

describe('DressCodeSettingsEditor', () => {
  const saved = { enabled: false, eyebrow: '', title: 'The Dress Code', intro: '', palette: ['#111111', '#222222'] };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getDressCode.mockResolvedValue(saved);
    api.updateDressCode.mockImplementation(async (body: typeof saved) => body);
  });

  it('adds, reorders, and removes palette colors, then saves', async () => {
    render(<DressCodeSettingsEditor />);
    await screen.findByLabelText('Color 1');

    await userEvent.click(screen.getByRole('button', { name: '+ Add color' }));
    expect(screen.getByLabelText('Color 3')).toHaveValue('#c84b7a');

    await userEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    expect(screen.getByLabelText('Color 1')).toHaveValue('#222222');

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove color' })[2]);
    await userEvent.click(screen.getByLabelText('Show on the Details page'));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(api.updateDressCode).toHaveBeenCalledWith({ ...saved, enabled: true, palette: ['#222222', '#111111'], imageUrls: [] });
    expect(await screen.findByText('Dress code saved.')).toBeInTheDocument();
  });

  it('blocks saving while a color is not a valid hex value', async () => {
    render(<DressCodeSettingsEditor />);
    const color = await screen.findByLabelText('Color 1');
    await userEvent.clear(color);
    await userEvent.type(color, 'blue');
    expect(screen.getByText('Colors must be hex values like #c84b7a.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  });
});
