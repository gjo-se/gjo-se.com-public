import AboutMe from './AboutMe';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/AboutMe',
  component: AboutMe,
  tags: ['autodocs'],
} satisfies Meta<typeof AboutMe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'Gregory Jo Erdmann',
    role: 'Senior AI Engineer / Architect',
    initials: 'GE',
    alt: 'Porträt von Gregory Jo Erdmann',
    paragraphs: [
      'Aus der Arbeit an eigenen Systemen hat sich mein Fokus auf **Architektur** geschärft.',
      '- KI nicht nur nutzen\n- sondern **verantwortungsvoll** bauen',
    ],
    downloadLabel: 'Timeline exportieren',
  },
};

export const Empty: Story = {
  args: {
    name: 'Gregory Jo Erdmann',
    initials: 'GE',
    paragraphs: [],
  },
};
