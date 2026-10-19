import { useEffect, useState } from 'react';

export interface FreshnessResult {
  isOutdated: boolean;
  sourceMtime: number;
  svgMtime: number;
  loading: boolean;
  error: string | null;
}

/**
 * Compares the mtime of a YAML source file with its generated SVG.
 *
 * Fetches ``GET /api/v1/admin/viscera/mtimes`` on mount and compares
 * ``nodes/<systemId>.yml`` against ``diagrams/rendered/<d2Key>.d2.svg``.
 */
export function useFreshnessCheck(
  systemId: string,
  d2Key: string,
): FreshnessResult {
  const [result, setResult] = useState<FreshnessResult>({
    isOutdated: false,
    sourceMtime: 0,
    svgMtime: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/v1/admin/viscera/mtimes');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const mtimes: Record<string, number> = await res.json();

        const yamlPath = `nodes/${systemId}.yml`;
        const svgPath = `diagrams/rendered/${d2Key}.d2.svg`;

        const sourceMtime = mtimes[yamlPath] ?? 0;
        const svgMtime = mtimes[svgPath] ?? 0;

        const isOutdated = svgMtime > 0 && sourceMtime > svgMtime;

        if (!cancelled) {
          setResult({ isOutdated, sourceMtime, svgMtime, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            isOutdated: false,
            sourceMtime: 0,
            svgMtime: 0,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [systemId, d2Key]);

  return result;
}
