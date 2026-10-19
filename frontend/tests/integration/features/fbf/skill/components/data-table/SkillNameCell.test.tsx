import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillNameCell from '@src/features/fbf/skill/components/data-table/SkillNameCell';

describe('SkillNameCell', () => {
  it('renders the skill name', () => {
    render(<SkillNameCell name="TypeScript" onRename={() => undefined} />);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('renames the skill on Enter', async () => {
    const onRename = vi.fn();
    render(<SkillNameCell name="TypeScript" onRename={onRename} />);

    fireEvent.click(screen.getByText('TypeScript'));
    const input = await screen.findByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, ' TypeScript 5 ');
    await userEvent.keyboard('{Enter}');

    expect(onRename).toHaveBeenCalledWith('TypeScript 5');
  });

  it('ignores an unchanged name', async () => {
    const onRename = vi.fn();
    render(<SkillNameCell name="TypeScript" onRename={onRename} />);

    fireEvent.click(screen.getByText('TypeScript'));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');

    expect(onRename).not.toHaveBeenCalled();
  });

  it('reverts on Escape without renaming', async () => {
    const onRename = vi.fn();
    render(<SkillNameCell name="TypeScript" onRename={onRename} />);

    fireEvent.click(screen.getByText('TypeScript'));
    await userEvent.type(await screen.findByRole('textbox'), 'Other');
    await userEvent.keyboard('{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
});
