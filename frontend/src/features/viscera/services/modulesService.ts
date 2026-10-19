import { importModulesResponseSchema } from '../core/modulesSchema';

import type { ImportModule } from '../core/modulesSchema';

/**
 * Fetches the L4 module graph from the API.
 *
 * Loads all modules from ``GET /api/v1/admin/viscera/imports``
 * (optionally scoped to a top-level module).
 */
export async function fetchModules(system: string, topLevel?: string): Promise<ImportModule[]> {
  const params = new URLSearchParams({ system });
  if (topLevel) params.set('top_level', topLevel);
  const response = await fetch(`/api/v1/admin/viscera/imports?${params.toString()}`);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} (/api/v1/admin/viscera/imports)`,
    );
  }
  const parsed = importModulesResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `Validierungs-Fehler: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  return parsed.data.modules;
}
