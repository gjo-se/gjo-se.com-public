import ProofGrid from './ProofGrid';

import type { Meta, StoryObj } from '@storybook/react-vite';

const proofs = [
  {
    id: 1,
    image_src: 'portfolio/feature/proof1.webp',
    statement: 'Erster Proof – Performance-Gewinn durch Caching.',
    priority: 'high',
    question: 'Wurde das auch gemessen und nicht nur behauptet?',
  },
  {
    id: 2,
    image_src: null,
    statement: 'Zweiter Proof – bessere Struktur und Wartbarkeit.',
    priority: 'medium',
    question: null,
  },
  {
    id: 3,
    image_src: 'portfolio/feature/proof2.webp',
    statement: 'Dritter Proof – mehr Nutzer erreicht.',
    priority: 'high',
    question: 'Wie viele Nutzer genau und über welchen Zeitraum?',
  },
];

const meta = {
  title: 'features/portfolio/ProofGrid',
  component: ProofGrid,
  tags: ['autodocs'],
  args: {
    proofs,
    streamUrl: (key: string) => `/api/v1/public/portfolio/stream/${key}`,
  },
} satisfies Meta<typeof ProofGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    proofs: [],
  },
};
