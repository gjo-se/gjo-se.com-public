import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ChangeMasterCombobox from '@src/components/molecules/ChangeMasterCombobox/ChangeMasterCombobox';
import { worker } from '@src/mocks/browser';

import type { Project } from '@src/lib/api/aiscope';

const master: Project = {
  id: 7,
  canonical_id: null,
  similarity_score: 0.8,
  match_score: 60,
  confirmed_score: 60,
  public_score: 60,
  url: 'https://example.com/7',
  title: 'Master Projekt',
  title_normalized: null,
  description: null,
  merged_description_de: null,
  merged_at: null,
  last_merge_call_log_id: null,
  city: 'Hamburg',
  country: 'DE',
  remote_percent: 80,
  contract_type: 'freelance',
  duration: '3 Monate',
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

describe('ChangeMasterCombobox', () => {
  it('shows an empty hint when no master matches', async () => {
    render(
      <ChangeMasterCombobox slaveProjectId={3} currentMasterId={1} onRefetch={vi.fn()} />,
    );

    await userEvent.fill(screen.getByPlaceholderText('Projekt-ID oder Titel…'), 'Nichts');

    expect(await screen.findByText('Keine Master-Projekte gefunden')).toBeVisible();
  });

  it('changes the master of the slave project after confirmation', async () => {
    worker.use(
      http.get('/api/v1/admin/fbf/projects/master-candidates', () =>
        HttpResponse.json([master]),
      ),
      http.post('/api/v1/admin/fbf/projects/:id/set-canonical', () =>
        HttpResponse.json({
          status: 'ok',
          project_id: 3,
          canonical_project_id: master.id,
        }),
      ),
    );
    const onRefetch = vi.fn();
    render(
      <ChangeMasterCombobox slaveProjectId={3} currentMasterId={1} onRefetch={onRefetch} />,
    );

    await userEvent.fill(screen.getByPlaceholderText('Projekt-ID oder Titel…'), 'Master');
    await userEvent.click(await screen.findByRole('option', { name: /Master Projekt/ }));

    expect(
      await screen.findByText('Master von Projekt #3 auf #7 – Master Projekt ändern?'),
    ).toBeVisible();

    screen.getByRole('button', { name: 'Bestätigen' }).click();

    await waitFor(() => expect(onRefetch).toHaveBeenCalledOnce());
  });
});
