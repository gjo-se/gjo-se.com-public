import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RejectedNoticeDialog from '@src/features/viscera/viewer/components/dialog/RejectedNoticeDialog';

import { makeObjectDetail } from '../../../visceraTestUtils';

function renderDialog(overrides: Partial<Parameters<typeof RejectedNoticeDialog>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    detail: makeObjectDetail({ name: 'Backend', typeLabel: 'Container' }),
    onConfirm: vi.fn(),
    isSending: false,
    ...overrides,
  };
  render(<RejectedNoticeDialog {...props} />);
  return props;
}

describe('RejectedNoticeDialog', () => {
  it('shows the object context and blocks confirmation below the minimum reason length', () => {
    renderDialog();

    expect(screen.getByText('Objekt ablehnen – Feedback an LLM')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Container')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ablehnung bestätigen' })).toBeDisabled();
  });

  it('confirms with the trimmed reason and optional prompt suggestion', () => {
    const view = renderDialog();

    fireEvent.change(screen.getByRole('textbox', { name: /Begründung/ }), {
      target: { value: '  Falsche Ebene im Modell  ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Prompt-Verbesserung/ }), {
      target: { value: '  Container statt System  ' },
    });

    expect(screen.getByText(/^\d+\/10 Zeichen$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ablehnung bestätigen' }));

    expect(view.onConfirm).toHaveBeenCalledWith(
      'Falsche Ebene im Modell',
      'Container statt System',
    );
  });

  it('disables both actions while the rejection is sending', () => {
    renderDialog({ isSending: true });

    expect(screen.getByRole('button', { name: 'Sende…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
  });

  it('cancels and resets the collected input', () => {
    const view = renderDialog();

    fireEvent.change(screen.getByRole('textbox', { name: /Begründung/ }), {
      target: { value: 'Zu kurz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(view.onOpenChange).toHaveBeenCalledWith(false);
  });
});
