/**
 * AdminProjectsActions – Page header with scraper controls.
 */

import ScraperControls from '@src/components/molecules/ScraperControls/ScraperControls';

import type { ScraperStatus } from '../../core/types';
import type { AdminProjectsActions as AdminProjectsActionsType,AdminProjectsState } from '../../hooks/useAdminProjects';

interface AdminProjectsActionsProps {
  state: Pick<AdminProjectsState, 'scraperStatus' | 'maxResults' | 'savedCount' | 'canScrape'>
  actions: Pick<AdminProjectsActionsType, 'handleScrape' | 'setMaxResults'>
}
/** Scraper trigger for the admin projects data table. */
export default function AdminProjectsActions({
  state: { scraperStatus, maxResults, savedCount, canScrape },
  actions: { handleScrape, setMaxResults },
}: AdminProjectsActionsProps) {
  return (
    <ScraperControls
      inputLabel="Max. Ergebnisse"
      inputId="max-results-projects"
      maxResults={maxResults}
      onMaxResultsChange={setMaxResults}
      scraperLabel={scraperLabel(scraperStatus, savedCount)}
      scraperDisabled={scraperStatus === 'running' || !canScrape}
      scraperVariant={scraperStatus === 'error' ? 'destructive' : 'default'}
      onScrape={() => void handleScrape()}
    />
  );
}

function scraperLabel(status: ScraperStatus, savedCount: number | null): string {
  switch (status) {
    case 'idle':   return 'Jetzt scrapen + normalisieren';
    case 'running': return 'Läuft…';
    case 'done':   return savedCount !== null ? `✓ ${savedCount} neu` : 'Fertig ✓';
    case 'error':  return 'Fehler';
  }
}
