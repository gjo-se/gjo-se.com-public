/**
 * GeneralCvDialog – shows the project-less CV (skills tagged ``site:promo``).
 *
 * Presentation only: loads the rendered PDF as an object URL when opened,
 * previews it in an iframe and offers a download. No project/submission context
 * – used to hand out the current CV without a detour.
 */
import { useEffect, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { extractApiError } from '@src/lib/api/extractError';

import { getGeneralCvBlob } from '../../services/applicationService';

export interface GeneralCvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog with the project-less CV preview and download. */
export default function GeneralCvDialog({ open, onOpenChange }: GeneralCvDialogProps) {
  const [cv, setCv] = useState<{ url: string; filename: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load the PDF blob into an object URL (revoked on close/unmount).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setCv(null);
    (async () => {
      try {
        const { blob, filename } = await getGeneralCvBlob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCv({ url: objectUrl, filename });
      } catch (err: unknown) {
        if (!cancelled) setError(extractApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open]);

  const handleDownload = () => {
    if (!cv) return;
    const anchor = document.createElement('a');
    anchor.href = cv.url;
    anchor.download = cv.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle>Lebenslauf</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <Text color="error" size="sm">
            {error}
          </Text>
        ) : cv ? (
          <iframe
            title="Lebenslauf"
            src={cv.url}
            className="h-dialog-lg w-full rounded-md border border-border"
          />
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <Button onClick={handleDownload} disabled={!cv}>
            Herunterladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
