import HomeSkillsTeaser from './HomeSkillsTeaser';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'molecules/HomeSkillsTeaser',
  component: HomeSkillsTeaser,
  tags: ['autodocs'],
} satisfies Meta<typeof HomeSkillsTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    eyebrow: '// Tech Stack',
    heading: 'Tiefe, die sich in stabilen Systemen zeigt',
    ctaLabel: 'Alle Skills',
    ctaHref: '/skills',
    cards: [
      {
        title: 'AI & LLM-Infrastruktur',
        description: 'Von der Idee zur nutzbaren Funktion – Modelle sauber angebunden, verifiziert und produktionsreif.',
        badges: ['LangChain', 'LangGraph', 'Restate'],
      },
      {
        title: 'Software-Architektur',
        description: 'Tragfähige Struktur, die mit wächst – statt technischer Schulden.',
        badges: ['Python', 'FastAPI', 'PostgreSQL'],
      },
      {
        title: 'Clean Code & Tests',
        description: 'Verständlicher, getesteter Code – die Qualität, die Ausfälle verhindert.',
        badges: ['2.232 Tests', 'Ruff', 'CI/CD'],
      },
    ],
  },
};
