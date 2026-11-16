import { render, screen } from '@testing-library/react';
import ContactPage from '@/app/(public)/contact/page';
import { publicApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({ publicApi: { getContact: jest.fn() } }));

const person = (id: string, extra: object = {}) => ({
  id, name: `Person ${id}`, role: null, email: null, phone: null, notes: null, displayOrder: 0, ...extra,
});

describe('Contact page', () => {
  it('lists each contact with their role, links and note', async () => {
    (publicApi.getContact as jest.Mock).mockResolvedValue([
      person('1', { name: 'Rai', role: 'Your wedding FAQ queen', phone: '+639150000000', email: 'rai@example.com', notes: 'Ask away~' }),
    ]);
    render(await ContactPage());
    expect(screen.getByRole('heading', { name: 'Rai' })).toBeInTheDocument();
    expect(screen.getByText('Your wedding FAQ queen')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+639150000000' })).toHaveAttribute('href', 'tel:+639150000000');
    expect(screen.getByRole('link', { name: 'rai@example.com' })).toHaveAttribute('href', 'mailto:rai@example.com');
    expect(screen.getByText('Ask away~')).toBeInTheDocument();
  });

  it('shows contacts like the homepage events: open columns split by hairlines, not boxed cards', async () => {
    (publicApi.getContact as jest.Mock).mockResolvedValue([person('1'), person('2'), person('3')]);
    render(await ContactPage());
    const column = screen.getByRole('heading', { name: 'Person 1' }).parentElement!;
    expect(column).not.toHaveClass('border');
    expect(column).toHaveClass('text-center');
    expect(column.parentElement).toHaveClass('gap-px', 'md:grid-cols-3');
  });

  it('uses two columns for two contacts and one for a single contact', async () => {
    (publicApi.getContact as jest.Mock).mockResolvedValue([person('1'), person('2')]);
    const { unmount } = render(await ContactPage());
    expect(screen.getByRole('heading', { name: 'Person 1' }).parentElement!.parentElement).toHaveClass('md:grid-cols-2');
    unmount();

    (publicApi.getContact as jest.Mock).mockResolvedValue([person('1')]);
    render(await ContactPage());
    expect(screen.getByRole('heading', { name: 'Person 1' }).parentElement!.parentElement).toHaveClass('max-w-md');
  });

  it('says contact details are coming when there are none', async () => {
    (publicApi.getContact as jest.Mock).mockResolvedValue([]);
    render(await ContactPage());
    expect(screen.getByText('Contact details coming soon.')).toBeInTheDocument();
  });
});
