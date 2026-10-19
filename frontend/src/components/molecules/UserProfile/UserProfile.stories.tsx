import UserProfile from './UserProfile';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/UserProfile',
  component: UserProfile,
  tags: ['autodocs'],
} satisfies Meta<typeof UserProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'Gregory',
    email: 'hi@gjo-se.com',
    role: 'admin',
    as: 'dl',
    children: 'UserProfile',
  },
};
