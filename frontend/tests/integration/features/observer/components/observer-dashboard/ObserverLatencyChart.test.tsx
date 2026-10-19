import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import ObserverLatencyChart from '@src/features/observer/components/observer-dashboard/ObserverLatencyChart';
import { createTestQueryClient } from '../../../integrationTestUtils';
import { worker } from '@src/mocks/browser';

function renderChart() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <ObserverLatencyChart />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('ObserverLatencyChart', () => {
  it('shows the empty hint when the selected window has no data', async () => {
    renderChart();

    expect(
      await screen.findByText('Keine Daten für gewähltes Zeitfenster'),
    ).toBeInTheDocument();
  });

  it('keeps the chart empty when the metrics request fails', async () => {
    worker.use(
      http.get('/api/v1/admin/llm/observer/metrics', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    renderChart();

    expect(
      await screen.findByText('Keine Daten für gewähltes Zeitfenster'),
    ).toBeInTheDocument();
  });
});
