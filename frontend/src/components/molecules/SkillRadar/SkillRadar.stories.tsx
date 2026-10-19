import SkillRadar from './SkillRadar';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SkillRadar',
  component: SkillRadar,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillRadar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skills: '<skills>',
    label: '<label>',
    as: 'span',
    size: 'xs',
    weight: 'medium',
    color: 'muted',
    role: 'button',
  },
};
