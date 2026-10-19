import Timeline from './Timeline';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/Timeline',
  component: Timeline,
  tags: ['autodocs'],
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Werdegang',
    items: [
      {
        date: '2025 – heute',
        title: 'Software-Architect / AI-Engineer',
        badge: 'gjo-se.com',
        description: '- LLM-Plattform (LangGraph, Restate, Observer)\n- vom Scraper bis zur React-UI',
        link: { href: 'https://gjo-se.com', label: 'Zum Projekt' },
      },
      {
        date: '2010 – 2024',
        title: 'Senior TYPO3-/Fullstack-Developer',
        badge: 'u. a. Charité FM',
        description: 'Relaunches, Shop-Lösungen, **Intranet** (Brands als Stichworte)',
      },
    ],
  },
};

export const OpenEnded: Story = {
  args: {
    title: 'Werdegang',
    items: [
      {
        date: '2008 – heute',
        title: 'Fullstack Software-Developer',
        badge: 'Freelancer gjo:Se',
        description: 'Selbstständig, seit fast 20 Jahren.',
      },
    ],
  },
};
