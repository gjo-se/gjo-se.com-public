/**
 * useAdrFileLoader – Hook for loading raw ADR file content via HTTP.
 *
 * Extracted from AdrEditor.tsx inline fetch logic.
 * Follows golden G6: props in, flat return object.
 *
 * - Tracks filePath changes with prevFilePath ref to reset state
 * - Uses fetchAdrContent from adrFileService (Increment 1)
 * - Handles cancellation via cleanup flag
 */

import { useEffect, useState } from 'react';

import { fetchAdrContent } from '../../services/adrFileService';

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Loads raw ADR file content for the editor.
 *
 * @param filePath - HTTP path to the ADR markdown file (e.g. "/architecture/adr/0001-foo.md").
 *                   When undefined, loading is set to false and no fetch occurs.
 * @returns `{ rawText, loading, error }` – flat return object (golden G6).
 */
export function useAdrFileLoader(filePath?: string): {
  rawText: string;
  loading: boolean;
  error: string | null;
} {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when filePath changes (adjusting state during render).
  const [prevFilePath, setPrevFilePath] = useState(filePath);
  if (prevFilePath !== filePath) {
    setPrevFilePath(filePath);
    setRawText('');
    setLoading(Boolean(filePath));
    setError(null);
  }

  useEffect(() => {
    if (!filePath) return;

    let cancelled = false;

    fetchAdrContent(filePath)
      .then((text) => {
        if (!cancelled) {
          setRawText(text);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return { rawText, loading, error };
}
