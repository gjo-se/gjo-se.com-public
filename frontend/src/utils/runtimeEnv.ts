/**
 * runtimeEnv – erkennt die deployed Umgebung zur Laufzeit anhand des Hostnamens.
 *
 * Deployment-Modell: ein Frontend-Build wird auf mehrere Hosts ausgerollt
 * (dev/test/… Subdomains von gjo-se.com, live = www.gjo-se.com). Da es keine
 * Laufzeit-Env-Variable gibt, ist der Hostname das zuverlässige Signal.
 */

export type RuntimeEnv = 'dev' | 'test' | 'prod';

/** Lokale Hostnamen, die als Dev-Umgebung zählen. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Ermittelt die Umgebung aus einem Hostnamen (Default: window.location.hostname).
 * - `dev.*`-Subdomain & lokale Hosts → 'dev'
 * - `test.*`- / `staging.*`-Subdomain → 'test'
 * - alles andere (live: www.gjo-se.com, Apex) → 'prod'
 */
export function detectRuntimeEnv(
  hostname: string =
    typeof window !== 'undefined' ? window.location.hostname : '',
): RuntimeEnv {
  const host = hostname.trim().toLowerCase();
  if (host === '') return 'prod';
  if (LOCAL_HOSTS.has(host)) return 'dev';
  if (host.startsWith('dev.')) return 'dev';
  if (host.startsWith('test.') || host.startsWith('staging.')) return 'test';
  return 'prod';
}
