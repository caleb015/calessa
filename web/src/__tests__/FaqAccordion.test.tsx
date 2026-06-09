import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FaqAccordion from '@/components/public/FaqAccordion';
import type { FaqItem } from '@/types/api';

const items: FaqItem[] = [
  { id: '1', question: 'What is the dress code?', answer: 'Black tie optional.', category: null, displayOrder: 0, isPublished: true },
  { id: '2', question: 'Is parking available?', answer: 'Yes, free parking on site.', category: null, displayOrder: 1, isPublished: true },
  { id: '3', question: 'Can I bring a plus one?', answer: 'Only if indicated on your invite.', category: null, displayOrder: 2, isPublished: true },
];

describe('FaqAccordion', () => {
  it('renders all questions', () => {
    render(<FaqAccordion items={items} />);
    expect(screen.getByText('What is the dress code?')).toBeInTheDocument();
    expect(screen.getByText('Is parking available?')).toBeInTheDocument();
    expect(screen.getByText('Can I bring a plus one?')).toBeInTheDocument();
  });

  it('all items start collapsed', () => {
    render(<FaqAccordion items={items} />);
    screen.getAllByRole('button').forEach(btn => {
      expect(btn).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('expands an item when its question is clicked', async () => {
    render(<FaqAccordion items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'What is the dress code?' }));
    expect(screen.getByRole('button', { name: 'What is the dress code?' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses an item when its question is clicked again', async () => {
    render(<FaqAccordion items={items} />);
    const btn = screen.getByRole('button', { name: 'What is the dress code?' });
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('allows multiple items to be open at the same time', async () => {
    render(<FaqAccordion items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'What is the dress code?' }));
    await userEvent.click(screen.getByRole('button', { name: 'Is parking available?' }));
    expect(screen.getByRole('button', { name: 'What is the dress code?' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Is parking available?' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opening one item does not close another', async () => {
    render(<FaqAccordion items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'What is the dress code?' }));
    await userEvent.click(screen.getByRole('button', { name: 'Can I bring a plus one?' }));
    expect(screen.getByRole('button', { name: 'What is the dress code?' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Is parking available?' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Can I bring a plus one?' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders with an empty list without crashing', () => {
    render(<FaqAccordion items={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
