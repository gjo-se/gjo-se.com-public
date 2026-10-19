import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import LLMModelsTab from '@src/features/llm/components/llm-models/LLMModelsTab';

function renderTab() {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <LLMModelsTab />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe('LLMModelsTab', () => {
  it('renders the model rows from the API', async () => {
    renderTab();

    expect(await screen.findByText('GPT-4')).toBeInTheDocument();
  });

  it('renders the table headers for the models table', async () => {
    renderTab();
    expect(await screen.findByText('GPT-4')).toBeInTheDocument();

    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
