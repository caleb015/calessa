import { render, screen } from '@testing-library/react';
import SchedulePage from '@/app/(public)/schedule/page';
import { publicApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({ publicApi: { getSchedule: jest.fn() } }));
const getSchedule = publicApi.getSchedule as jest.Mock;

const item = (over: object) => ({ id: 'i1', timeLabel: '3:00 PM', title: 'Ceremony', description: null, location: null, ...over });

describe('Schedule page', () => {
  it('shows the location as a distinct, labelled line, separate from the description', async () => {
    getSchedule.mockResolvedValue([item({ location: 'Emerald Events Place', description: 'Please be seated by 2:45.' })]);
    render(await SchedulePage());

    const location = screen.getByText('Emerald Events Place').closest('p')!;
    const description = screen.getByText('Please be seated by 2:45.');
    expect(location).toHaveTextContent('Location: Emerald Events Place'); // read out by screen readers
    expect(location.querySelector('svg')).toBeInTheDocument(); // map pin
    // Set apart from the description by size and style, without shouting.
    expect(location).toHaveClass('text-xs', 'italic');
    expect(location).not.toHaveClass('uppercase', 'font-semibold');
    expect(description).toHaveClass('text-sm');
    expect(description).not.toHaveClass('italic');
    expect(location.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('leaves out the location line when an item has none', async () => {
    getSchedule.mockResolvedValue([item({ description: 'Dinner is served.' })]);
    render(await SchedulePage());
    expect(screen.getByText('Dinner is served.')).toBeInTheDocument();
    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
  });
});
