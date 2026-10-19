import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TwoColumnForm from '@src/components/forms/TwoColumnForm/TwoColumnForm';

import type { TwoColumnFormProps } from '@src/components/forms/TwoColumnForm/TwoColumnForm.interface';
import type { FormEvent } from 'react';

function buildFormProps(overrides: Partial<TwoColumnFormProps['formProps']> = {}): TwoColumnFormProps['formProps'] {
  return {
    title: 'Projekt',
    loading: false,
    saving: false,
    error: '',
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('TwoColumnForm', () => {
  it('renders title, children and the action buttons', () => {
    render(
      <TwoColumnForm formProps={buildFormProps({ title: 'Projekt bearbeiten' })}>
        <input aria-label="Name" />
      </TwoColumnForm>,
    );

    expect(screen.getByRole('heading', { name: 'Projekt bearbeiten' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  });

  it('shows the spinner instead of the form while loading', () => {
    render(
      <TwoColumnForm formProps={buildFormProps({ loading: true })}>
        <input aria-label="Name" />
      </TwoColumnForm>,
    );

    expect(screen.queryByRole('heading', { name: 'Projekt' })).not.toBeInTheDocument();
  });

  it('shows the error message', () => {
    render(
      <TwoColumnForm formProps={buildFormProps({ error: 'Speichern fehlgeschlagen.' })}>
        <span>Inhalt</span>
      </TwoColumnForm>,
    );

    expect(screen.getByText('Speichern fehlgeschlagen.')).toBeVisible();
  });

  it('submits the form and reports cancel', async () => {
    const onSave = vi.fn((event?: FormEvent) => event?.preventDefault());
    const onCancel = vi.fn();
    render(
      <TwoColumnForm formProps={buildFormProps({ onSave, onCancel })}>
        <span>Inhalt</span>
      </TwoColumnForm>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await userEvent.click(screen.getByRole('button', { name: '← Zurück' }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('shows the saving label while saving', () => {
    render(
      <TwoColumnForm formProps={buildFormProps({ saving: true })}>
        <span>Inhalt</span>
      </TwoColumnForm>,
    );

    expect(screen.getByRole('button', { name: 'Speichert…' })).toBeVisible();
  });
});
