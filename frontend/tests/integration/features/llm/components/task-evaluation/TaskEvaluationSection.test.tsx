import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import TaskEvaluationSection from '@src/features/llm/components/task-evaluation/TaskEvaluationSection';

function renderSection() {
  return render(
    <MantineProvider>
      <TaskEvaluationSection taskKey="description_merge" />
    </MantineProvider>,
  );
}

describe('TaskEvaluationSection', () => {
  it('renders the evaluation header after loading', async () => {
    renderSection();

    expect(await screen.findByText('Evaluation')).toBeInTheDocument();
  });

  it('shows the empty state when no evaluation exists', async () => {
    renderSection();

    expect(
      await screen.findByText('Noch keine Evaluation durchgeführt.'),
    ).toBeInTheDocument();
  });

  it('offers the trigger button for a new evaluation', async () => {
    renderSection();

    expect(await screen.findByRole('button', { name: /Eval durchführen/ })).toBeEnabled();
  });

  it('starts an evaluation run on click', async () => {
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: /Eval durchführen/ }));

    expect(await screen.findByRole('button', { name: /Läuft…/ })).toBeInTheDocument();
  });
});
