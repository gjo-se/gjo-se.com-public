import { describe, expect, it } from 'vitest';

import {
  batchDedupBase,
  chartsBase,
  fmBase,
  overrideBase,
  projectsBase,
  scraperAbortBase,
  scraperStatusBase,
  unifiedScraperBase,
} from '@src/lib/api/aiscopeEndpoints';

describe('aiscopeEndpoints', () => {
  it('exposes the shared aiscope admin base paths', () => {
    expect(fmBase).toBe('/admin/fbf/raw/freelancermap');
    expect(projectsBase).toBe('/admin/fbf/projects');
    expect(unifiedScraperBase).toBe('/admin/fbf/scraper/run');
    expect(scraperStatusBase).toBe('/admin/fbf/scraper/status');
    expect(scraperAbortBase).toBe('/admin/fbf/scraper/abort');
    expect(overrideBase).toBe('/admin/fbf/project-freelancer-map');
    expect(chartsBase).toBe('/admin/fbf/charts');
    expect(batchDedupBase).toBe('/admin/fbf/batch-dedup/run');
  });

  it('keeps every base path absolute, unique and without a trailing slash', () => {
    const bases = [
      fmBase,
      projectsBase,
      unifiedScraperBase,
      scraperStatusBase,
      scraperAbortBase,
      overrideBase,
      chartsBase,
      batchDedupBase,
    ];

    expect(new Set(bases).size).toBe(bases.length);
    bases.forEach((value) => {
      expect(value.startsWith('/admin/')).toBe(true);
      expect(value.endsWith('/')).toBe(false);
    });
  });
});
