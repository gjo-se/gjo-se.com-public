import ProfilePhotoRow from './ProfilePhotoRow';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'applicationProfile/ProfilePhotoRow',
  component: ProfilePhotoRow,
  tags: ['autodocs'],
} satisfies Meta<typeof ProfilePhotoRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPhoto: Story = {
  args: {
    photoUrl: 'profile/photo.png',
    version: '2026-08-20T00:00:00Z',
    onSelect: async () => {},
  },
};

export const WithoutPhoto: Story = {
  args: {
    photoUrl: null,
    version: '2026-08-20T00:00:00Z',
    onSelect: async () => {},
  },
};
