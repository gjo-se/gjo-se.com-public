import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  fetchChartBar,
  fetchChartImpact,
  fetchChartMonthly,
  fetchChartTrend,
} from '@src/lib/api/aiscopeCharts';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const chartsPath = '/api/v1/admin/fbf/charts';

describe('aiscopeCharts', () => {
  it('forwards role and top-n filters to the bar chart', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${chartsPath}/bar`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([
          { skill_id: 4, skill_name: 'TypeScript', importance: 5 },
        ]);
      }),
    );

    const points = await fetchChartBar({ role_id: 2, top_n: 5 });

    expect(parameters.latest()?.get('role_id')).toBe('2');
    expect(parameters.latest()?.get('top_n')).toBe('5');
    expect(points).toEqual([{ skill_id: 4, skill_name: 'TypeScript', importance: 5 }]);
  });

  it('joins skill ids into one comma separated trend parameter', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${chartsPath}/trend`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([
          { window_start: '2026-09-01', skill_name: 'React', relative_frequency: 0.4 },
        ]);
      }),
    );

    const points = await fetchChartTrend({ skill_ids: [4, 9], window: 'month' });

    expect(parameters.latest()?.get('skill_ids')).toBe('4,9');
    expect(parameters.latest()?.get('window')).toBe('month');
    expect(points[0].relative_frequency).toBe(0.4);
  });

  it('uses 75 as the default monthly match threshold', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${chartsPath}/monthly`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json([{ month: '2026-09', total: 12, matching: 5 }]);
      }),
    );

    const points = await fetchChartMonthly();

    expect(parameters.latest()?.get('threshold')).toBe('75');
    expect(points).toEqual([{ month: '2026-09', total: 12, matching: 5 }]);
  });

  it('surfaces a failing chart endpoint as an error', async () => {
    worker.use(
      http.get(`${chartsPath}/impact`, () =>
        HttpResponse.json({ detail: 'Aggregation fehlgeschlagen' }, { status: 500 }),
      ),
    );

    await expect(fetchChartImpact()).rejects.toThrow('500');
  });
});
