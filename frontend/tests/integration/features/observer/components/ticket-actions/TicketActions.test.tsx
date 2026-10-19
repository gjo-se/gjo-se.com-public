import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TicketActions from '@src/features/observer/components/ticket-actions/TicketActions';
import type { ObserverTicket } from '@src/features/observer/core/types';

const openTicket = {
  id: 1,
  ticket_type: 'latency_anomaly',
  severity: 'warning',
  task: 'description_merge',
  diagnosis: 'Fixture-Diagnose.',
  langfuse_trace_url: null,
  status: 'open',
  created_at: '2026-10-01T08:00:00Z',
  resolved_at: null,
} as unknown as ObserverTicket;

describe('TicketActions', () => {
  it('offers acknowledge, resolve and dismiss for an open ticket', () => {
    render(<TicketActions ticket={openTicket} onUpdate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Bestätigen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lösen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verwerfen' })).toBeInTheDocument();
  });

  it('hides the acknowledge action for an acknowledged ticket', () => {
    render(
      <TicketActions ticket={{ ...openTicket, status: 'acknowledged' }} onUpdate={vi.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Bestätigen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lösen' })).toBeInTheDocument();
  });

  it('hides all actions for a resolved ticket', () => {
    render(<TicketActions ticket={{ ...openTicket, status: 'resolved' }} onUpdate={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Lösen' })).not.toBeInTheDocument();
  });

  it('reports the updated ticket after resolving', async () => {
    const onUpdate = vi.fn();
    render(<TicketActions ticket={openTicket} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Lösen' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
  });
});
