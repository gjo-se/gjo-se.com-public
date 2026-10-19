import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import FileUpload from '@src/components/forms/FileUpload/FileUpload';

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('file input missing');
  return input;
}

describe('FileUpload', () => {
  it('renders the default label as a button', () => {
    render(<FileUpload onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Datei auswählen oder hierher ziehen/ })).toBeVisible();
  });

  it('reports the selected file', async () => {
    const onChange = vi.fn();
    const { container } = render(<FileUpload onChange={onChange} />);

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await userEvent.upload(getFileInput(container), file);

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it('reports null when the selection is cleared', async () => {
    const onChange = vi.fn();
    const { container } = render(<FileUpload onChange={onChange} />);

    await userEvent.upload(getFileInput(container), []);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('disables interaction when disabled', () => {
    const { container } = render(<FileUpload onChange={vi.fn()} disabled />);

    expect(getFileInput(container)).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
  });
});
