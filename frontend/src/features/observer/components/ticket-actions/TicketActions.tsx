import { useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import type { ObserverTicket } from '@src/features/observer/core/types';
import { updateTicketStatus } from '@src/features/observer/services/observerTicketService';

interface TicketActionsProps {
  ticket: ObserverTicket;
  onUpdate: (updated: ObserverTicket) => void;
}

/**
 *
 */
export default function TicketActions({ ticket, onUpdate }: TicketActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (status: string) => {
    setLoading(status);
    try {
      const updated = await updateTicketStatus(ticket.id, status);
      onUpdate(updated);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {ticket.status === 'open' && (
        <Button
          variant="outline"
          size="sm"
          loading={loading === 'acknowledged'}
          onClick={() => handleAction('acknowledged')}
        >
          Bestätigen
        </Button>
      )}
      {['open', 'acknowledged', 'in_progress'].includes(ticket.status) && (
        <>
          <Button
            variant="outline"
            size="sm"
            loading={loading === 'resolved'}
            onClick={() => handleAction('resolved')}
          >
            Lösen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={loading === 'dismissed'}
            onClick={() => handleAction('dismissed')}
          >
            Verwerfen
          </Button>
        </>
      )}
    </div>
  );
}
