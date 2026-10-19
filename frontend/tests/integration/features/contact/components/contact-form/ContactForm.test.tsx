import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import ContactForm from '@src/features/contact/components/contact-form/ContactForm';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/kontakt']}>
      <MantineProvider>
        <ContactForm />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe('ContactForm', () => {
  it('renders the three contact fields', () => {
    renderForm();

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Nachricht')).toBeInTheDocument();
  });

  it('enables the submit button once the contact token is loaded', async () => {
    renderForm();

    const submit = await screen.findByRole('button', { name: /contact\.form\.submitCta/ });
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it('shows the success message after a valid submit', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Max Mustermann' } });
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'max@example.com' } });
    fireEvent.change(screen.getByLabelText('Nachricht'), {
      target: { value: 'Eine ausreichend lange Nachricht für das Kontaktformular.' },
    });
    const submit = screen.getByRole('button', { name: /contact\.form\.submitCta/ });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByText('contact.success.title')).toBeInTheDocument();
  });
});
