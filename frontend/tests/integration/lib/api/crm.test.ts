import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  createAddress,
  createCompany,
  createProjectCrmPerson,
  deleteCompany,
  enrichProjectContacts,
  extractCompanyAddress,
  fetchAddresses,
  fetchCompanies,
  fetchCompanyCount,
  fetchPersonCount,
  fetchProjectCrmPersons,
  mergeCompanies,
  updateCompany,
} from '@src/lib/api/crm';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const crmPath = '/api/v1/admin/crm';

describe('crm', () => {
  it('forwards the company filters to the list endpoint', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${crmPath}/companies`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([{ id: 1, name: 'Example GmbH' }]);
      }),
    );

    const companies = await fetchCompanies({ q: 'Example', limit: 10, offset: 20 });

    expect(parameters.latest()?.get('q')).toBe('Example');
    expect(parameters.latest()?.get('limit')).toBe('10');
    expect(parameters.latest()?.get('offset')).toBe('20');
    expect(companies[0].name).toBe('Example GmbH');
  });

  it('returns the company and person counts', async () => {
    const companyCount = await fetchCompanyCount({ q: 'Example' });
    const personCount = await fetchPersonCount({ q: 'Alex' });

    expect(companyCount).toBe(1);
    expect(personCount).toBe(1);
  });

  it('creates a company with its payload', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${crmPath}/companies`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, name: 'Neue Firma' });
      }),
    );

    const company = await createCompany({ name: 'Neue Firma' });

    expect(receivedBody).toEqual({ name: 'Neue Firma' });
    expect(company.id).toBe(2);
  });

  it('updates a company through its put endpoint', async () => {
    let receivedBody: unknown;
    worker.use(
      http.put(`${crmPath}/companies/:id`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 2, name: 'Umbenannt GmbH' });
      }),
    );

    const company = await updateCompany(2, { name: 'Umbenannt GmbH' });

    expect(receivedBody).toEqual({ name: 'Umbenannt GmbH' });
    expect(company.name).toBe('Umbenannt GmbH');
  });

  it('deletes a company without a response body', async () => {
    let deletedId = '';
    worker.use(
      http.delete(`${crmPath}/companies/:id`, ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await deleteCompany(2);

    expect(result).toBeUndefined();
    expect(deletedId).toBe('2');
  });

  it('lists and creates company addresses', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${crmPath}/companies/:id/addresses`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 5, city: 'Hamburg' });
      }),
    );

    const addresses = await fetchAddresses(1);
    const created = await createAddress(1, {
      crm_company_id: 1,
      city: 'Hamburg',
      is_primary: false,
    });

    expect(addresses).toHaveLength(1);
    expect(receivedBody).toEqual({ crm_company_id: 1, city: 'Hamburg', is_primary: false });
    expect(created.id).toBe(5);
  });

  it('returns the extracted address from a created response', async () => {
    worker.use(
      http.post(`${crmPath}/companies/:id/extract-address`, () =>
        HttpResponse.json({ id: 6, city: 'Köln' }, { status: 201 }),
      ),
    );

    const address = await extractCompanyAddress(1);

    expect(address.city).toBe('Köln');
  });

  it('throws the backend message when no address was extracted', async () => {
    worker.use(
      http.post(`${crmPath}/companies/:id/extract-address`, () =>
        HttpResponse.json({ message: 'Keine Adresse gefunden' }),
      ),
    );

    await expect(extractCompanyAddress(1)).rejects.toThrow('Keine Adresse gefunden');
  });

  it('reports a duplicate project-person link as an error', async () => {
    worker.use(
      http.post(`${crmPath}/project-crm-persons`, () =>
        HttpResponse.json({ detail: 'Bereits verknüpft' }, { status: 409 }),
      ),
    );

    await expect(
      createProjectCrmPerson({ project_id: 1, crm_person_id: 1, label: 'primary' }),
    ).rejects.toThrow('409');
  });

  it('runs the project enrichment pipeline with an empty body by default', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${crmPath}/project-enrich/:id/enrich-contacts`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          company: { id: 1, name: 'Example GmbH' },
          person: { id: 1, first_name: 'Alex' },
          project_crm_person_link_id: 9,
          enrichment_details: null,
        });
      }),
    );

    const result = await enrichProjectContacts(7);

    expect(receivedBody).toEqual({});
    expect(result.project_crm_person_link_id).toBe(9);
  });

  it('loads the project-person links for a project', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${crmPath}/project-crm-persons`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([{ id: 9, project_id: 7, crm_person_id: 1 }]);
      }),
    );

    const links = await fetchProjectCrmPersons({ project_id: 7 });

    expect(parameters.latest()?.get('project_id')).toBe('7');
    expect(links[0].id).toBe(9);
  });

  it('merges a source company into a target company', async () => {
    let mergePath = '';
    worker.use(
      http.post(`${crmPath}/companies/:sourceId/merge/:targetId`, ({ request }) => {
        mergePath = new URL(request.url).pathname;
        return HttpResponse.json({ id: 2, name: 'Ziel GmbH' });
      }),
    );

    const company = await mergeCompanies(1, 2);

    expect(mergePath).toBe('/api/v1/admin/crm/companies/1/merge/2');
    expect(company.id).toBe(2);
  });
});
