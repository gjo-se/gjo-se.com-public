import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PdfDownloadButton from '@src/features/pdf/components/pdf-download-button/PdfDownloadButton';

describe('PdfDownloadButton', () => {
  it('shows the download label and triggers the handler', () => {
    const onClick = vi.fn();
    render(<PdfDownloadButton onClick={onClick} loading={false} disabled={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'PDF herunterladen' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the generating label and blocks clicks while loading', () => {
    const onClick = vi.fn();
    render(<PdfDownloadButton onClick={onClick} loading={true} disabled={false} />);

    const button = screen.getByRole('button', { name: 'Wird generiert…' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('blocks clicks when disabled', () => {
    const onClick = vi.fn();
    render(<PdfDownloadButton onClick={onClick} loading={false} disabled={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'PDF herunterladen' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
