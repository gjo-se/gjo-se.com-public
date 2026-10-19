import Button from '@src/components/primitives/Button';

export interface PdfDownloadButtonProps {
  /** Called when the button is clicked. */
  onClick: () => void;
  /** Whether a download is currently in progress. */
  loading: boolean;
  /** Whether the button should be disabled. */
  disabled: boolean;
}

/** Molecule: Button that triggers a PDF download via the provided onClick handler. */
export default function PdfDownloadButton({ onClick, loading, disabled }: PdfDownloadButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant="secondary"
      size="sm"
    >
      {loading ? 'Wird generiert…' : 'PDF herunterladen'}
    </Button>
  );
}
