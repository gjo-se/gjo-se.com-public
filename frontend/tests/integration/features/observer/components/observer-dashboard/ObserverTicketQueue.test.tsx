import { fireEvent, render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import ObserverTicketQueue from '@src/features/observer/components/observer-dashboard/ObserverTicketQueue';
import { worker } from '@src/mocks/browser';

function renderQueue() {
  return render(
    <MantineProvider>
      <ObserverTicketQueue />
    </MantineProvider>,
  );
}

describe('ObserverTicketQueue', () => {
  it('lists the open tickets from the API', async () => {
    renderQueue();

    expect(await screen.findByText('description_merge')).toBeInTheDocument();
    expect(screen.getByText('latency')).toBeInTheDocument();
  });

  it('shows the empty state when no ticket matches', async () => {
    worker.use(
      http.get('/api/v1/admin/llm/observer/tickets', () => HttpResponse.json([])),
    );
    renderQueue();

    expect(await screen.findByText('Keine offenen Tickets')).toBeInTheDocument();
  });

  it('shows the API error message', async () => {
    worker.use(
      http.get('/api/v1/admin/llm/observer/tickets', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    renderQueue();

    expect(await screen.findByText(/Fehler:/)).toBeInTheDocument();
  });

  it('filters the tickets by severity', async () => {
    renderQueue();
    expect(await screen.findByText('description_merge')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Alle Schweregrade'), {
      target: { value: 'critical' },
    });

    expect(await screen.findByText('Keine offenen Tickets')).toBeInTheDocument();
  });

  it('reports the number of visible tickets', async () => {
    renderQueue();

    expect(await screen.findByText('1 Ticket')).toBeInTheDocument();
  });
});
