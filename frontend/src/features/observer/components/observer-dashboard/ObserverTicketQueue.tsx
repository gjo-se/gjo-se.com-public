import { useMemo, useState } from 'react';

import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import type { ObserverTicket } from '@src/features/observer/core/types';
import { useObserverTickets } from '@src/features/observer/hooks/useObserverTickets';

import TicketActions from '../ticket-actions/TicketActions';

import { EMPTY_ICON, EMPTY_STATE, TABLE_WRAP, TRACE_LINK } from './constants';
import SortHeader, { type SortDir, type SortField } from './SortHeader';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive/20 text-destructive',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-info-subtle-bg text-info-subtle-text',
};

const TYPE_LABELS: Record<string, string> = {
  latency_anomaly: 'Latenz',
  error_spike: 'Fehler',
  cost_overrun: 'Kosten',
};

const RELATIVE_TIME = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

/**
 *
 */
export default function ObserverTicketQueue() {
  const { tickets, isLoading, error, refetch } = useObserverTickets();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const handleUpdate = (updated: ObserverTicket) => {
    if (['resolved', 'dismissed'].includes(updated.status)) {
      refetch();
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter);
    }
    if (severityFilter !== 'all') {
      list = list.filter(t => t.severity === severityFilter);
    }
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'created_at') {
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return dir * String(a[sortField]).localeCompare(String(b[sortField]));
    });
    return list;
  }, [tickets, statusFilter, severityFilter, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className="p-4">
        <Text color="secondary">Lade Tickets…</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Text color="error">Fehler: {error}</Text>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className={EMPTY_STATE}>
        <div className={EMPTY_ICON}>
          <Text as="span">✅</Text>
        </div>
        <Text>Keine offenen Tickets</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-on-surface"
        >
          <option value="all">Alle Status</option>
          <option value="open">Offen</option>
          <option value="acknowledged">Bestätigt</option>
          <option value="in_progress">In Arbeit</option>
        </select>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-on-surface"
        >
          <option value="all">Alle Schweregrade</option>
          <option value="critical">Kritisch</option>
          <option value="warning">Warnung</option>
          <option value="info">Info</option>
        </select>
        <div className="ml-auto self-center">
          <Text as="span" size="sm" color="secondary">
            {filtered.length} Ticket{filtered.length !== 1 ? 's' : ''}
          </Text>
        </div>
      </div>

      {/* Table */}
      <div className={TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-container text-left">
              <SortHeader field="severity" label="Schweregrad" current={sortField} dir={sortDir} onClick={handleSort} />
              <SortHeader field="task" label="Task" current={sortField} dir={sortDir} onClick={handleSort} />
              <th className="px-4 py-2 font-medium text-on-surface-secondary">Typ</th>
              <th className="px-4 py-2 font-medium text-on-surface-secondary">Diagnose</th>
              <SortHeader field="created_at" label="Erstellt" current={sortField} dir={sortDir} onClick={handleSort} />
              <th className="px-4 py-2 font-medium text-on-surface-secondary">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ticket => (
              <tr key={ticket.id} className="border-b border-border-light hover:bg-surface-container-hover">
                <td className="px-4 py-2">
                  <div className={`inline-block rounded-full px-2 py-0.5 ${SEVERITY_COLORS[ticket.severity] || ''}`}>
                    <Text as="span" size="xs" weight="medium">
                      {ticket.severity}
                    </Text>
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{ticket.task}</td>
                <td className="px-4 py-2">{TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}</td>
                <td className="px-4 py-2 max-w-xs" title={ticket.diagnosis || undefined}>
                  {truncate(ticket.diagnosis)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-on-surface-muted text-xs">
                  {relativeTime(ticket.created_at)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {ticket.langfuse_trace_url && (
                      <div className={TRACE_LINK}>
                        <Link
                          href={ticket.langfuse_trace_url}
                          external
                          title="LangFuse Trace öffnen"
                        >
                          🔗
                        </Link>
                      </div>
                    )}
                    <TicketActions ticket={ticket} onUpdate={handleUpdate} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return RELATIVE_TIME.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return RELATIVE_TIME.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  return RELATIVE_TIME.format(-days, 'day');
}

function truncate(text: string | null, max = 100): string {
  if (!text) return '—';
  return text.length > max ? text.slice(0, max) + '…' : text;
}
