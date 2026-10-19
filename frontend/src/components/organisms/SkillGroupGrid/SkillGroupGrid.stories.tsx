import SkillGroupGrid from './SkillGroupGrid';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/SkillGroupGrid',
  component: SkillGroupGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillGroupGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    labelledby: 'skills-grid-title',
    as: 'span',
    variant: 'meta',
    id: 'skills-grid-title',
    role: 'button',
    weight: 'semibold',
    size: 'xs',
    color: 'primary',
    name: 'chevron-right',
  },
};
