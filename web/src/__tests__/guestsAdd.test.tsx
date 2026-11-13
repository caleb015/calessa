import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestsPage from '@/app/dashboard/guests/page';
import { adminApi } from '@/lib/adminApi';
import { parseGuestRows, withoutBlanks } from '@/lib/guestImport';

jest.mock('@/lib/adminApi', () => ({
  adminApi: {
    getGuests: jest.fn(),
    getSettings: jest.fn(),
    createGuest: jest.fn(),
    bulkCreateGuests: jest.fn(),
    exportGuestsCsv: () => '/admin/export/guests.csv',
  },
}));

describe('parseGuestRows', () => {
  it('reads tab-separated rows pasted from a spreadsheet', () => {
    expect(parseGuestRows('Juan dela Cruz\tjuan@example.com\tFamily\t0917 123 4567\r\nMaria\t\tFriends')).toEqual([
      { primaryName: 'Juan dela Cruz', email: 'juan@example.com', group: 'Family', phone: '0917 123 4567' },
      { primaryName: 'Maria', group: 'Friends' },
    ]);
  });

  it('reads typed comma-separated rows and name-only rows, skipping blank lines', () => {
    expect(parseGuestRows('Juan, juan@example.com, Family\n\n  \nLola Nena\n')).toEqual([
      { primaryName: 'Juan', email: 'juan@example.com', group: 'Family' },
      { primaryName: 'Lola Nena' },
    ]);
  });
});

describe('withoutBlanks', () => {
  it('drops empty text fields but keeps numbers and booleans', () => {
    expect(withoutBlanks({ primaryName: 'Juan', email: '', group: ' ', allowedPartySize: 1, plusOneAllowed: false }))
      .toEqual({ primaryName: 'Juan', allowedPartySize: 1, plusOneAllowed: false });
  });
});

describe('Guests page add and bulk import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminApi.getGuests as jest.Mock).mockResolvedValue([]);
    (adminApi.getSettings as jest.Mock).mockResolvedValue({ allowMaybe: false });
  });

  it('adds a guest without an email and does not send blank fields', async () => {
    (adminApi.createGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
    render(<GuestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Add Guest/ }));
    fireEvent.change(screen.getByPlaceholderText('Full name *'), { target: { value: 'Lola Nena' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Guest' }).at(-1)!);

    await waitFor(() => expect(adminApi.createGuest).toHaveBeenCalledWith({
      primaryName: 'Lola Nena', allowedPartySize: 1, plusOneAllowed: false, requiresMealSelection: false,
    }));
    await waitFor(() => expect(screen.queryByPlaceholderText('Full name *')).not.toBeInTheDocument());
  });

  it('shows the error and keeps the form open when adding fails', async () => {
    (adminApi.createGuest as jest.Mock).mockRejectedValue(new Error('email must be an email'));
    render(<GuestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Add Guest/ }));
    fireEvent.change(screen.getByPlaceholderText('Full name *'), { target: { value: 'Juan' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Guest' }).at(-1)!);

    expect(await screen.findByText('email must be an email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full name *')).toHaveValue('Juan');
    expect(screen.getAllByRole('button', { name: 'Add Guest' }).at(-1)).not.toBeDisabled();
  });

  it('imports rows, lists skipped lines and leaves only those in the box', async () => {
    (adminApi.bulkCreateGuests as jest.Mock).mockResolvedValue({
      created: 1, skipped: 1, errors: [{ row: 2, name: 'Pedro', reason: 'email must be an email' }],
    });
    render(<GuestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bulk Import' }));
    const box = screen.getByLabelText('Guest rows');
    fireEvent.change(box, { target: { value: 'Juan, juan@example.com\nPedro, 0917\n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(adminApi.bulkCreateGuests).toHaveBeenCalledWith({
      guests: [{ primaryName: 'Juan', email: 'juan@example.com' }, { primaryName: 'Pedro', email: '0917' }],
    }));
    expect(await screen.findByText(/1 added, 1 skipped/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2 \(Pedro\): email must be an email/)).toBeInTheDocument();
    expect(box).toHaveValue('Pedro, 0917');
  });

  it('shows an error if the import request fails', async () => {
    (adminApi.bulkCreateGuests as jest.Mock).mockRejectedValue(new Error('Request failed: 500'));
    render(<GuestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bulk Import' }));
    fireEvent.change(screen.getByLabelText('Guest rows'), { target: { value: 'Juan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('Request failed: 500')).toBeInTheDocument();
  });
});
