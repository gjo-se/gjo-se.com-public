import ContactCard from './ContactCard';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/ContactCard',
  component: ContactCard,
  tags: ['autodocs'],
} satisfies Meta<typeof ContactCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    contactName: ''<contactName>'',
    company: ''<company>'',
    sourcePmTitle: ''<sourcePmTitle>'',
    similarityScore: 0,
    size: 'sm',
    variant: 'muted',
    weight: 'medium',
    as: 'span',
    color: 'muted',
    Score: 1,
  },
};
