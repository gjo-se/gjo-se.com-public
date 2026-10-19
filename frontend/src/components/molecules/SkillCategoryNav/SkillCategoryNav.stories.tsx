import SkillCategoryNav from './SkillCategoryNav';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SkillCategoryNav',
  component: SkillCategoryNav,
  tags: ['autodocs'],
} satisfies Meta<typeof SkillCategoryNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Skill-Kategorien',
    hidden: true,
  },
};
