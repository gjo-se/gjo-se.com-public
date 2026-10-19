import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import PipelineTestSection from '@src/features/llm/components/pipeline-test-section/PipelineTestSection';

function renderSection(taskKey: string) {
  return render(
    <MantineProvider>
      <PipelineTestSection taskKey={taskKey} />
    </MantineProvider>,
  );
}

describe('PipelineTestSection', () => {
  it('renders nothing for a task without a pipeline', () => {
    renderSection('description_merge');

    expect(screen.queryByText('Pipeline-Test')).not.toBeInTheDocument();
  });

  it('renders the pipeline controls for an endcustomer task', () => {
    renderSection('endcustomer-research');

    expect(screen.getByText('Pipeline-Test')).toBeInTheDocument();
    expect(screen.getByText('Pipeline-Umfang')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Projekt suchen…')).toBeInTheDocument();
  });

  it('offers all pipeline scopes in the act selector', () => {
    renderSection('endcustomer-research');

    expect(screen.getByRole('option', { name: 'Vollständig (Acts 1-8)' })).toBeInTheDocument();
  });

  it('blocks the start button until act and project are chosen', () => {
    renderSection('endcustomer-research');

    expect(screen.getByRole('button', { name: /Start/ })).toBeDisabled();
  });

  it('shows the empty-state instruction before the first run', () => {
    renderSection('endcustomer-research');

    expect(
      screen.getByText('Wähle einen Act und ein Projekt, dann klicke Start.'),
    ).toBeInTheDocument();
  });
});
