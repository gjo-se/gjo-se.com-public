import SkillGroupHero from './SkillGroupHero';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/SkillGroupHero',
  component: SkillGroupHero,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillGroupHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skills: '<skills>',
    onOpenSlide: 0,
    openSlideTarget: 0,
    title: '<title>',
    id: 'skills-hero-title',
    labelledby: 'skills-hero-title',
    as: 'span',
    variant: 'meta',
    color: 'secondary',
    weight: 'medium',
    role: 'button',
    label: 'Radar vergrößern',
    size: 'xs',
  },
};
