import ProofCard from './ProofCard';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'features/portfolio/ProofCard',
  component: ProofCard,
  tags: ['autodocs'],
  args: {
    proof: {
      id: 1,
      image_src: 'portfolio/feature/proof1.webp',
      statement: 'Signifikante Verbesserung der Ladezeit und Konversion nach Umsetzung.',
      priority: 'high',
      question: 'Wurde das auch gemessen und nicht nur behauptet?',
    },
    streamUrl: (key: string) => `/api/v1/public/portfolio/stream/${key}`,
  },
} satisfies Meta<typeof ProofCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutImage: Story = {
  args: {
    proof: {
      id: 2,
      image_src: null,
      statement: 'Statements ohne Bild wirken weiterhin als eigenständiger Proof.',
      priority: 'medium',
      question: null,
    },
  },
};
