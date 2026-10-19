import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import InlineEditDisplay from '@src/components/table/InlineEditDisplay';

describe('InlineEditDisplay', () => {
  it('renders the preview content', () => {
    render(
      <InlineEditDisplay value="Wert" onStart={vi.fn()}>
        <span>Vorschau</span>
      </InlineEditDisplay>,
    );

    expect(screen.getByText('Vorschau')).toBeVisible();
  });

  it('starts editing on click', async () => {
    const onStart = vi.fn();
    render(
      <InlineEditDisplay value="Wert" onStart={onStart}>
        <span>Vorschau</span>
      </InlineEditDisplay>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it('starts editing on Enter and Space', async () => {
    const onStart = vi.fn();
    render(
      <InlineEditDisplay value="Wert" onStart={onStart}>
        <span>Vorschau</span>
      </InlineEditDisplay>,
    );

    const trigger = screen.getByRole('button');
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys', async () => {
    const onStart = vi.fn();
    render(
      <InlineEditDisplay value="Wert" onStart={onStart}>
        <span>Vorschau</span>
      </InlineEditDisplay>,
    );

    screen.getByRole('button').focus();
    await userEvent.keyboard('{Tab}');

    expect(onStart).not.toHaveBeenCalled();
  });
});
