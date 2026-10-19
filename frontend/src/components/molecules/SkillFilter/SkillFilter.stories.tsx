import SkillFilter from './SkillFilter';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SkillFilter',
  component: SkillFilter,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Skills filtern…',
    as: 'span',
    size: 'xs',
    variant: 'chip-remove',
    color: 'muted',
    slot: 'combobox-input',
  },
};
