import AboutTeaser from './AboutTeaser';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/AboutTeaser',
  component: AboutTeaser,
  tags: ['autodocs'],
} satisfies Meta<typeof AboutTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'Gregory Jo Erdmann',
    role: 'Senior AI Architect · LLM-Plattform',
    hook: 'Ich baue LLM-Infrastruktur, auf der Anwendungen stabil laufen – nicht Prototypen, sondern Plattformen.',
    ctaLabel: 'Mehr über mich',
    ctaHref: '/about',
  },
};
