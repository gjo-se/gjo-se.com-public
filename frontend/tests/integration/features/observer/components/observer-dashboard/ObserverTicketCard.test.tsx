import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import ObserverTicketCard from '@src/features/observer/components/observer-dashboard/ObserverTicketCard';

describe('ObserverTicketCard', () => {
  it('counts the open observer tickets by severity', async () => {
    render(
      <MantineProvider>
        <ObserverTicketCard />
      </MantineProvider>,
    );

    expect(await screen.findByText('1 offen')).toBeInTheDocument();
    expect(screen.getByText('0 critical')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('0 info')).toBeInTheDocument();
  });

  it('scrolls to the ticket queue when clicked', async () => {
    const queue = document.createElement('div');
    queue.id = 'ticket-queue';
    queue.scrollIntoView = vi.fn();
    document.body.appendChild(queue);

    render(
      <MantineProvider>
        <ObserverTicketCard />
      </MantineProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Offene Tickets/ }));

    await waitFor(() => expect(queue.scrollIntoView).toHaveBeenCalled());
    queue.remove();
  });
});
