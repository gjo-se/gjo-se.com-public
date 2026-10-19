import { render, screen } from '@testing-library/react';
import { useForm } from '@tanstack/react-form';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { z } from 'zod';

import FormField from '@src/components/forms/FormField/FormField';
import FormProvider from '@src/components/forms/FormField/FormProvider';

import type { FormSchema } from '@src/components/forms/FormField/FormProvider.types';

function Harness({ schema }: { schema?: FormSchema }) {
  const form = useForm({ defaultValues: { email: '' } });

  return (
    <MemoryRouter>
      <FormProvider form={form as never} schema={schema ?? null}>
        <FormField name="email" label="E-Mail" type="email" />
      </FormProvider>
    </MemoryRouter>
  );
}

describe('FormField', () => {
  it('renders a labelled input and tracks the value', async () => {
    render(<Harness />);

    const input = screen.getByLabelText('E-Mail');
    await userEvent.type(input, 'a@b.de');

    expect(input).toHaveValue('a@b.de');
  });

  it('renders the validation error from the context schema', async () => {
    render(<Harness schema={z.object({ email: z.string().email('E-Mail') })} />);

    await userEvent.type(screen.getByLabelText('E-Mail'), 'keine-mail');

    expect(await screen.findByText('Ungültige E-Mail-Adresse')).toBeVisible();
  });

  it('shows no error for a valid value', async () => {
    render(<Harness schema={z.object({ email: z.string().email() })} />);

    await userEvent.type(screen.getByLabelText('E-Mail'), 'a@b.de');

    expect(screen.queryByText('Ungültige E-Mail-Adresse')).not.toBeInTheDocument();
  });
});
