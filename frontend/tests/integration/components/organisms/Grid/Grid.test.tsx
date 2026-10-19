import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import Grid from '@src/components/organisms/Grid/Grid';

interface CardItem {
  title: string;
  tags: string[];
}

function Card({ item }: { item: CardItem }) {
  return <article>{item.title}</article>;
}

const items: CardItem[] = [
  { title: 'Projekt Alpha', tags: ['React', 'TypeScript'] },
  { title: 'Projekt Beta', tags: ['Python'] },
];

describe('Grid', () => {
  it('renders the title and one card per item', () => {
    render(
      <Grid title="Portfolio" subtitle="Meine Projekte" items={items} Component={Card} />,
    );

    expect(screen.getByText('Portfolio')).toBeVisible();
    expect(screen.getByText('Projekt Alpha')).toBeVisible();
    expect(screen.getByText('Projekt Beta')).toBeVisible();
  });

  it('derives the filters from the item tags', () => {
    render(<Grid items={items} Component={Card} />);

    expect(screen.getByRole('button', { name: 'React' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Python' })).toBeVisible();
  });

  it('filters the cards by the selected tag', async () => {
    render(<Grid items={items} Component={Card} />);

    await userEvent.click(screen.getByRole('button', { name: 'Python' }));

    expect(screen.getByText('Projekt Beta')).toBeVisible();
    expect(screen.queryByText('Projekt Alpha')).not.toBeInTheDocument();
  });

  it('resets the filter when the active tag is clicked again', async () => {
    render(<Grid items={items} Component={Card} />);

    await userEvent.click(screen.getByRole('button', { name: 'Python' }));
    await userEvent.click(screen.getByRole('button', { name: 'Python' }));

    expect(screen.getByText('Projekt Alpha')).toBeVisible();
  });

  it('renders a loading shell instead of the grid', () => {
    render(<Grid loading items={items} Component={Card} />);

    expect(screen.queryByText('Projekt Alpha')).not.toBeInTheDocument();
  });

  it('renders an error state when loading failed', () => {
    render(<Grid errorMessage="Laden fehlgeschlagen" items={[]} Component={Card} />);

    expect(screen.getByText('Ladefehler')).toBeVisible();
    expect(screen.getByText('Laden fehlgeschlagen')).toBeVisible();
  });
});
