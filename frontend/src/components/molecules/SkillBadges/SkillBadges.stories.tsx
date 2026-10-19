import SkillBadges from './SkillBadges';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SkillBadges',
  component: SkillBadges,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillBadges>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skills: [
      { id: 1, name: 'Python', effective_importance: 5.0, level: 4, status: 'confirmed' },
      { id: 2, name: 'Docker', effective_importance: 5.0, level: 4, status: 'confirmed' },
      { id: 3, name: 'FastAPI', effective_importance: 4.67, level: 5, status: 'confirmed' },
      { id: 4, name: 'Kubernetes', effective_importance: 5.0, level: null, status: 'archived' },
      { id: 5, name: 'Scrum', effective_importance: 3.0, level: 2, status: 'confirmed' },
      { id: 6, name: 'AWS', effective_importance: 5.0, level: null, status: 'confirmed' },
    ],
  },
};

export const Empty: Story = {
  args: {
    skills: [],
  },
};
