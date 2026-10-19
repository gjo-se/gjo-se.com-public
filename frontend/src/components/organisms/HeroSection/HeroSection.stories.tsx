import HeroSection from './HeroSection';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'organisms/HeroSection',
  component: HeroSection,
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    headline: 'Von der KI-Idee zur stabilen Produktion.',
    usp: 'AI · Architektur · Clean Code',
    subline: 'Baue LLM-Infrastruktur, auf der Anwendungen stabil laufen.',
    ctaLabel: 'Projekt anfragen',
    ctaHref: '/contact',
  },
};
