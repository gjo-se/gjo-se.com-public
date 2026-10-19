/**
 * usePdfDownload – Hook for PDF generation + browser download.
 *
 * Encapsulates the API call, Blob→ObjectURL conversion, and download trigger
 * via a temporary anchor element. Cleans up the ObjectURL after download.
 */
import { useCallback, useState } from 'react';

import { generatePdf } from '../services/pdfService';

export interface UsePdfDownloadResult {
  downloadPdf: (templateName: string, data: Record<string, unknown>, filename: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook that provides a `downloadPdf` function for generating and downloading PDFs.
 */
export function usePdfDownload(): UsePdfDownloadResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPdf = useCallback(
    async (templateName: string, data: Record<string, unknown>, filename: string) => {
      setLoading(true);
      setError(null);
      try {
        const blob = await generatePdf(templateName, data);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Fehler beim PDF-Download');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { downloadPdf, loading, error };
}
