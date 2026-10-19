import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DescriptionField from '@src/features/viscera/viewer/components/dialog/DescriptionField';

describe('DescriptionField', () => {
  it('renders the label and the current value', () => {
    render(
      <DescriptionField
        id="description"
        value="Container für die API"
        onChange={vi.fn()}
        placeholder="Beschreibung eingeben…"
      />,
    );

    expect(screen.getByText('Beschreibung')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Beschreibung/ })).toHaveValue('Container für die API');
    expect(screen.getByPlaceholderText('Beschreibung eingeben…')).toBeInTheDocument();
  });

  it('forwards every keystroke to onChange', () => {
    const onChange = vi.fn();
    render(
      <DescriptionField
        id="description"
        value=""
        onChange={onChange}
        placeholder="Beschreibung eingeben…"
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Beschreibung/ }), {
      target: { value: 'Neue Beschreibung' },
    });

    expect(onChange).toHaveBeenCalledWith('Neue Beschreibung');
  });

  it('disables the textarea when requested', () => {
    render(
      <DescriptionField
        id="description"
        value=""
        onChange={vi.fn()}
        placeholder="Beschreibung eingeben…"
        disabled
      />,
    );

    expect(screen.getByRole('textbox', { name: /Beschreibung/ })).toBeDisabled();
  });
});
