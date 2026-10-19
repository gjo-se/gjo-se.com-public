import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import InlineMarkdownEditRow from '@src/components/molecules/InlineMarkdownEditRow/InlineMarkdownEditRow';

describe('InlineMarkdownEditRow', () => {
  it('renders the label and the markdown preview', () => {
    render(
      <InlineMarkdownEditRow label="Beschreibung" field="description" value="**Wichtig**" onSave={vi.fn()} />,
    );

    expect(screen.getByText('Beschreibung')).toBeVisible();
    expect(screen.getByRole('button')).toHaveTextContent('Wichtig');
  });

  it('shows a dash when the value is empty', () => {
    render(<InlineMarkdownEditRow label="Beschreibung" field="description" value={null} onSave={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveTextContent('–');
  });

  it('opens the editor and saves the trimmed draft with Ctrl+Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineMarkdownEditRow label="Beschreibung" field="description" value="Alt" onSave={onSave} />,
    );

    await userEvent.click(screen.getByRole('button'));
    await userEvent.fill(screen.getByRole('textbox'), '  Neu  ');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith('description', 'Neu');
  });

  it('discards the draft on Escape', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineMarkdownEditRow label="Beschreibung" field="description" value="Alt" onSave={onSave} />,
    );

    await userEvent.click(screen.getByRole('button'));
    await userEvent.fill(screen.getByRole('textbox'), 'Neu');
    await userEvent.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveTextContent('Alt');
  });
});
