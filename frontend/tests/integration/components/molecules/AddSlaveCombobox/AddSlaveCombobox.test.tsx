import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import AddSlaveCombobox from '@src/components/molecules/AddSlaveCombobox/AddSlaveCombobox';
import { worker } from '@src/mocks/browser';

import type { Project } from '@src/lib/api/aiscope';

const candidate: Project = {
  id: 42,
  canonical_id: null,
  similarity_score: 0.9,
  match_score: 70,
  confirmed_score: 70,
  public_score: 70,
  url: 'https://example.com/42',
  title: 'Testprojekt Backend',
  title_normalized: null,
  description: null,
  merged_description_de: null,
  merged_at: null,
  last_merge_call_log_id: null,
  city: 'Berlin',
  country: 'DE',
  remote_percent: 100,
  contract_type: 'freelance',
  duration: '6 Monate',
  start_date: null,
  posted_at: null,
  scraped_at: null,
  search_term: null,
  job_role_name: null,
  merge_dirty: false,
  company_name: null,
  contact_name: null,
  industry: null,
  notes: null,
  hourly_rate: null,
  my_hourly_rate: null,
  my_start_date: null,
  endcustomer: null,
  endcustomer_researched_at: null,
  skills: [],
  slave_count: 0,
  freelancermap_id: null,
  status: 'new',
  status_color_token: null,
};

describe('AddSlaveCombobox', () => {
  it('shows an empty hint when no linkable project matches', async () => {
    render(<AddSlaveCombobox canonicalProjectId={1} onRefetch={vi.fn()} />);

    await userEvent.fill(screen.getByPlaceholderText('Projekt-ID oder Titel…'), 'Nichts');

    expect(await screen.findByText('Keine verknüpfbaren Projekte gefunden')).toBeVisible();
  });

  it('links the selected project as slave after confirmation', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/slave-candidates', () =>
        HttpResponse.json([candidate]),
      ),
      http.post('/api/v1/admin/fbf/projects/:id/set-canonical', () =>
        HttpResponse.json({
          status: 'ok',
          project_id: candidate.id,
          canonical_project_id: 1,
        }),
      ),
    );
    const onRefetch = vi.fn();
    render(<AddSlaveCombobox canonicalProjectId={1} onRefetch={onRefetch} />);

    await userEvent.fill(screen.getByPlaceholderText('Projekt-ID oder Titel…'), 'Testprojekt');
    await userEvent.click(await screen.findByRole('option', { name: /Testprojekt Backend/ }));

    expect(
      await screen.findByText(
        'Projekt #42 – Testprojekt Backend als Slave zu Projekt #1 hinzufügen?',
      ),
    ).toBeVisible();

    screen.getByRole('button', { name: 'Bestätigen' }).click();

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
  });
});
