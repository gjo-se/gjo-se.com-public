import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import MailTitleCell from '@src/components/organisms/ProjectComparisonTable/MailTitleCell';
import { worker } from '@src/mocks/browser';

describe('MailTitleCell', () => {
  it('shows the curated value with the scraped title as placeholder', () => {
    render(
      <MailTitleCell projectId={1} value="Kuratierter Titel" fallback="Scraped Titel" onRefetch={vi.fn()} />,
    );

    expect(screen.getByLabelText('Titel für die Bewerbungs-Mail')).toHaveValue('Kuratierter Titel');
    expect(screen.getByLabelText('Titel für die Bewerbungs-Mail')).toHaveAttribute(
      'placeholder',
      'Scraped Titel',
    );
  });

  it('saves the edited title on blur', async () => {
    let body: unknown;
    worker.use(
      http.patch('/api/v1/admin/fbf/projects/:id/title-normalized', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    const onRefetch = vi.fn();
    render(
      <MailTitleCell projectId={1} value={null} fallback="Scraped Titel" onRefetch={onRefetch} />,
    );

    const input = screen.getByLabelText('Titel für die Bewerbungs-Mail');
    await userEvent.fill(input, 'Neuer Titel');
    await userEvent.tab();

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
    expect(body).toEqual({ title_normalized: 'Neuer Titel' });
  });

  it('stores null when the override is cleared', async () => {
    let body: unknown;
    worker.use(
      http.patch('/api/v1/admin/fbf/projects/:id/title-normalized', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    render(
      <MailTitleCell projectId={1} value="Alter Titel" fallback="Scraped" onRefetch={vi.fn()} />,
    );

    const input = screen.getByLabelText('Titel für die Bewerbungs-Mail');
    await userEvent.clear(input);
    await userEvent.tab();

    await waitFor(() => expect(body).toEqual({ title_normalized: null }));
  });

  it('does not save an unchanged title', async () => {
    const onRefetch = vi.fn();
    render(
      <MailTitleCell projectId={1} value="Titel" fallback="Scraped" onRefetch={onRefetch} />,
    );

    await userEvent.click(screen.getByLabelText('Titel für die Bewerbungs-Mail'));
    await userEvent.tab();

    expect(onRefetch).not.toHaveBeenCalled();
  });
});
