import { expect, fn, userEvent } from 'storybook/test';

import TagColorPalette from './TagColorPalette';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'atoms/TagColorPalette',
  component: TagColorPalette,
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
  },
} satisfies Meta<typeof TagColorPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All 13 swatches – none pre-selected. */
export const Default: Story = {
  args: {},
};

/** "amber" pre-selected with ring-2 outline. */
export const Selected: Story = {
  args: {
    value: 'amber',
  },
};

/** All swatches dimmed and non-interactive. */
export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'amber',
  },
};

/** Keyboard navigation: ArrowRight selects next, Enter selects. */
export const KeyboardInteraction: Story = {
  args: {
    value: 'red',
  },
  play: async ({ canvas }) => {
    // Tab into the radiogroup – the selected "red" should be focused
    await userEvent.tab();
    const redBtn = canvas.getByRole('radio', { name: 'red' });
    await expect(redBtn).toHaveFocus();

    // ArrowRight → next token (orange)
    await userEvent.keyboard('{ArrowRight}');
    const orangeBtn = canvas.getByRole('radio', { name: 'orange' });
    await expect(orangeBtn).toHaveFocus();

    // ArrowLeft → back to red
    await userEvent.keyboard('{ArrowLeft}');
    await expect(redBtn).toHaveFocus();

    // ArrowUp (wraps to last)
    await userEvent.keyboard('{ArrowUp}');
    const grayBtn = canvas.getByRole('radio', { name: 'gray' });
    await expect(grayBtn).toHaveFocus();

    // Enter selects the focused token
    await userEvent.keyboard('{Enter}');
  },
};
