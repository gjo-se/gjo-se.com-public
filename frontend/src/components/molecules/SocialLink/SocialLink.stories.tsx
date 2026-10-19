import SocialLink from './SocialLink';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/SocialLink',
  component: SocialLink,
  tags: ['autodocs'],
} satisfies Meta<typeof SocialLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    SocialPlatform: 'github',
    platform: 'mail',
    href: 'mailto:hi@gjo-se.com',
    label: 'Kontakt',
    variant: 'muted',
    size: 'sm',
    as: 'span',
    children: 'SocialLink',
  },
};
