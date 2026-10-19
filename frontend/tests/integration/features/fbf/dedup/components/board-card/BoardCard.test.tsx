import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import BoardCard from '@src/features/fbf/dedup/components/board-card/BoardCard';

import { makeBoardItem } from '../../../fbfTestUtils';

describe('BoardCard', () => {
  it('renders skill id, name and status badge', () => {
    render(
      <BoardCard
        item={makeBoardItem()}
        isPinned={false}
        isSelected={false}
        onCardClick={() => undefined}
      />,
    );

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('renders scores and the slave count for a master with aliases', () => {
    render(
      <BoardCard
        item={makeBoardItem({ alias_count: 3 })}
        isPinned={false}
        isSelected={false}
        onCardClick={() => undefined}
      />,
    );

    expect(screen.getByText('Importance: 4')).toBeInTheDocument();
    expect(screen.getByText('Level: 3 / 3')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders dashes for missing scores and an empty slave count', () => {
    render(
      <BoardCard
        item={makeBoardItem({
          importance: null,
          level: null,
          level_public: null,
          description: null,
        })}
        isPinned={false}
        isSelected={false}
        onCardClick={() => undefined}
      />,
    );

    expect(screen.getByText('Importance: –')).toBeInTheDocument();
    expect(screen.getByText('Level: – / –')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders the similarity percentage as a chip', () => {
    render(
      <BoardCard
        item={makeBoardItem()}
        isPinned={false}
        isSelected={false}
        onCardClick={() => undefined}
        similarity={0.73}
      />,
    );

    expect(screen.getByText('73 %')).toBeInTheDocument();
  });

  it('reports the clicked item and modifier state', async () => {
    const onCardClick = vi.fn();
    render(
      <BoardCard
        item={makeBoardItem()}
        isPinned={false}
        isSelected={false}
        onCardClick={onCardClick}
      />,
    );

    await userEvent.click(screen.getByText('#1'));

    expect(onCardClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      { meta: false, shift: false },
    );
  });

  it('renames a skill on Enter and trims the draft', async () => {
    const onRename = vi.fn();
    render(
      <BoardCard
        item={makeBoardItem()}
        isPinned={false}
        isSelected={false}
        onCardClick={() => undefined}
        onRename={onRename}
      />,
    );

    await userEvent.click(screen.getByText('TypeScript'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '  TypeScript 5  ');
    await userEvent.keyboard('{Enter}');

    expect(onRename).toHaveBeenCalledWith(1, 'TypeScript 5');
  });

  it('reverts an aborted rename without calling onRename', async () => {
    const onRename = vi.fn();
    render(
      <BoardCard
        item={makeBoardItem()}
        isPinned={false}
        isSelected={false}
        onCardClick={() => undefined}
        onRename={onRename}
      />,
    );

    await userEvent.click(screen.getByText('TypeScript'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'Something else');
    await userEvent.keyboard('{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
});
