/**
 * Observer feature – Public API barrel.
 *
 * Re-exports the observer metrics/ticket services, hooks and types so
 * consumers import from the feature root rather than deep paths.
 */

export { fetchMetrics } from './services/observerMetricsService';

export { fetchTickets, sendTestPush, updateTicketStatus } from './services/observerTicketService';

export { useObserverTickets } from './hooks/useObserverTickets';

export type { ObserverMetrics, ObserverTicket, TaskMetric, TimelinePoint } from './core/types';

export { default as ObserverErrorCard } from './components/observer-dashboard/ObserverErrorCard';
export { default as ObserverHealthCard } from './components/observer-dashboard/ObserverHealthCard';
export { default as ObserverLatencyChart } from './components/observer-dashboard/ObserverLatencyChart';
export { default as ObserverTicketCard } from './components/observer-dashboard/ObserverTicketCard';
export { default as ObserverTicketQueue } from './components/observer-dashboard/ObserverTicketQueue';
export { default as TicketActions } from './components/ticket-actions/TicketActions';
