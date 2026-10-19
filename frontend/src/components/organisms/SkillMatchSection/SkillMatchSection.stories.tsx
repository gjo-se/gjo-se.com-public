import SkillMatchSection from './SkillMatchSection';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/SkillMatchSection',
  component: SkillMatchSection,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillMatchSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skills: '<skills>',
    onOpenSlide: 0,
    title: '<title>',
    role: 'button',
    label: 'Match-Radar vergrößern',
    as: 'span',
    size: 'xs',
    color: 'muted',
    id: 'skills.fallback.tooFew',
  },
};
