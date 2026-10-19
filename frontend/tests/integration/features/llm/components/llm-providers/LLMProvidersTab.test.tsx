import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import LLMProvidersTab from '@src/features/llm/components/llm-providers/LLMProvidersTab';

function renderTab() {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <LLMProvidersTab />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe('LLMProvidersTab', () => {
  it('renders the provider rows from the API', async () => {
    renderTab();

    expect(await screen.findByText('openai')).toBeInTheDocument();
    expect(screen.getByText('anthropic')).toBeInTheDocument();
  });

  it('offers the OpenRouter sync action', () => {
    renderTab();

    expect(screen.getByRole('button', { name: '🔄 OpenRouter Sync' })).toBeInTheDocument();
  });
});
