import { z } from 'zod';

import type { ZodTypeAny } from 'zod';

export const formOverrides: Record<string, ZodTypeAny> = {
  tags: z.string(),              // Komma-separierter String → API: string[]
  importance: z.string(),        // Numerischer Score als Form-String → API: number|null
  level: z.string(),             // Numerischer Score als Form-String → API: number|null
  level_public: z.string(),      // Numerischer Score als Form-String → API: number|null
};
