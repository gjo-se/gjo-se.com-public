import { z } from 'zod';

// ── L4 Module (API-Schema) ─────────────────────────────────────────────────

/**
 * Ein einzelnes Python-Modul der L4-Analyse. Kanonische Struktur des
 * `GET /api/v1/architecture/imports`-Endpoints.
 */
const importModuleSchema = z.object({
  name: z.string(),
  path: z.string(),
  imports: z.array(z.string()),
  top_level: z.string(),
});

export type ImportModule = z.infer<typeof importModuleSchema>;

/** Response des L4-Imports-Endpoints – SSOT der API-Grenze. */
export const importModulesResponseSchema = z.object({
  system: z.string(),
  generated_at: z.string(),
  modules: z.array(importModuleSchema),
});
