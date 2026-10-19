/**
 * steadyStateFlush – Pull-basierter Flush-Takt für RUM-Metriken.
 *
 * Stößt in festem Intervall einen Flush an, damit das Backend auch dann
 * "steady-state"-Daten erhält, wenn die Seite nie genug Metriken für einen
 * Batch-Flush erzeugt. Der Flush selbst wird injiziert (kein verstecktes
 * Koppeln an den Transport).
 */

let steadyStateTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the steady-state flush interval (one flush per pull interval).
 *
 * @param flush - The flush callback invoked once per interval.
 */
export function startSteadyStateFlush(flush: () => void): void {
  if (steadyStateTimer) return;
  steadyStateTimer = setInterval(flush, 30000);
}
