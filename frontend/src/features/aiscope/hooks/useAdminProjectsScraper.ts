/**
 * Scraper + batch-dedup state and handlers for the AdminProjects page.
 *
 * Owns the run/abort/poll flow (with live toasts) and the full-reset flow;
 * triggers a list reload via the injected `reload` callback.
 */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { abortScraper, fetchScraperStatus, runBatchDedup, runScraper } from '@src/lib/api/aiscope';

import type { ReReadStatus, ScraperStatus } from '../core/types';

/** Params for the scraper hook. */
export interface UseAdminProjectsScraperParams {
  /** Reloads the project list from page 0 (called after a run finishes). */
  reload: () => void
  /** Resets the table to the first page without reloading (batch-dedup error path). */
  setPage: (page: number) => void
}

/** State + actions exposed by the scraper hook. */
export interface UseAdminProjectsScraperResult {
  scraperStatus: ScraperStatus
  maxResults: string
  setMaxResults: (value: string) => void
  savedCount: number | null
  batchDedupStatus: ReReadStatus
  batchDedupResult: string | null
  handleScrape: () => Promise<void>
  handleBatchDedup: () => Promise<void>
}

/** Owns the scraper run/poll/abort and batch-dedup state for AdminProjects. */
export function useAdminProjectsScraper({
  reload,
  setPage,
}: UseAdminProjectsScraperParams): UseAdminProjectsScraperResult {
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus>('idle');
  const [maxResults, setMaxResults] = useState<string>('');
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const abortRef = useRef(false);

  const handleScrape = useCallback(async () => {
    setScraperStatus('running');
    setSavedCount(null);
    const parsed = parseInt(maxResults, 10);
    const limit = !isNaN(parsed) && parsed > 0 ? parsed : undefined;

    try {
      const result = await runScraper(limit);

      if (result.status === 'started') {
        // Async mode – poll for progress
        abortRef.current = false;
        const liveToastId = toast.loading('Scraper gestartet…', {
          description: 'Scraping läuft — Fortschritt wird live aktualisiert.',
          cancel: {
            label: 'Abbrechen',
            onClick: () => {
              abortRef.current = true;
              void abortScraper();
              setScraperStatus('idle');
              toast.error('Abgebrochen', { id: liveToastId, duration: 5000 });
            },
          },
        });

        const poll = async () => {
          if (abortRef.current) return;
          try {
            const status = await fetchScraperStatus();
            if (status.phase === 'scraping') {
              toast.loading(
                `Scraping: ${status.scraper_role} (${status.scraper_roles_done}/${status.scraper_roles_total})`,
                {
                  id: liveToastId,
                  description: `Seite ${status.scraper_page}/${status.scraper_pages_total} · ${status.scraper_saved} neu`,
                },
              );
            } else if (status.phase === 'mapping') {
              toast.loading(
                `Mapping: ${status.mapper_processed}/${status.mapper_total}`,
                {
                  id: liveToastId,
                  description: `${status.mapper_new} neu · ${status.mapper_duplicates} Duplikate · ${status.mapper_url_matches} URL · ${status.mapper_errors} Fehler`,
                },
              );
            }

            if (status.phase === 'done' && status.stats) {
              const s = status.stats;
              const cost = (s.estimated_cost ?? 0) > 0 ? `~$${s.estimated_cost}` : '$0';
              toast.success(
                `✓ ${s.new_projects ?? 0} neue Projekte, ${s.duplicates ?? 0} Duplikate`,
                {
                  id: liveToastId,
                  description: `${s.url_matches ?? 0} URL-Matches · ${s.embedding_calls ?? 0} Embedding-Calls · ${cost}`,
                  duration: 8000,
                },
              );
              setSavedCount(s.new_projects);
              setScraperStatus('done');
              reload();
              return;
            }

            if (status.phase === 'error') {
              toast.error('Scraper-Fehler — die Normalisierung ist fehlgeschlagen', {
                id: liveToastId,
                description: status.error || 'Prüfe die Docker-Logs (docker compose logs backend) für die genaue Ursache.',
                cancel: { label: 'Schließen', onClick: () => {} },
                duration: Infinity,
              });
              setScraperStatus('error');
              reload();
              return;
            }

            if (status.running) {
              setTimeout(poll, 2000);
            }
          } catch {
            // Polling error – keep trying
            setTimeout(poll, 3000);
          }
        };

        setTimeout(poll, 1000);
        return;
      }

      // Isolierter Fargate-Job-Dispatch (prod, #2940): kein In-Process-Status im API –
      // nur bestätigen, dass der Job gestartet wurde. Kein Fehler-Toast, kein /scraper/status-Poll.
      if (result.status === 'launched') {
        const taskArn = result.task_arn;
        setSavedCount(null);
        setScraperStatus('done');
        reload();
        toast.success('Scraper-Job gestartet', {
          description: taskArn
            ? `Isolierter Fargate-Job gestartet (${taskArn}).`
            : 'Isolierter Fargate-Job gestartet.',
        });
        return;
      }

      // Legacy sync mode fallback
      setSavedCount(result.saved);
      setScraperStatus(result.status === 'done' ? 'done' : 'error');
      reload();

      if (result.status === 'done' && result.stats) {
        const s = result.stats;
        const cost = (s.estimated_cost ?? 0) > 0 ? `~$${s.estimated_cost}` : '$0';
        toast.success(
          `✓ ${s.new_projects ?? 0} neue Projekte, ${s.duplicates ?? 0} Duplikate`,
          {
            description: `${s.url_matches ?? 0} URL-Matches · ${s.embedding_calls ?? 0} Embedding-Calls · ${cost}`,
            duration: 8000,
          },
        );
      } else if (result.status === 'error') {
        toast.error('Scraper-Fehler — die Normalisierung ist fehlgeschlagen', {
          description:
            'Der Scraper-Lauf wurde mit einem Fehler beendet. '
            + 'Prüfe die Docker-Logs (docker compose logs backend) für die genaue Ursache.',
          cancel: { label: 'Schließen', onClick: () => {} },
          duration: Infinity,
        });
      } else if (result.status === 'done' && result.saved === 0 && !result.stats) {
        const reason = (result as unknown as Record<string, unknown>).reason;
        const skipped = (result as unknown as Record<string, unknown>).skipped as string[] | undefined;
        const detail = reason === 'no_credentials'
          ? 'Freelancermap-Credentials fehlen. Hinterlege Login-Daten in den Admin-Credentials.'
          : skipped?.includes('freelancermap')
            ? 'Das Freelancermap-Portal ist deaktiviert. Aktiviere es in den Admin-Credentials.'
            : 'Keine neuen Einträge zum Verarbeiten.';
        toast.warning('Scraper: Keine Daten verarbeitet', {
          description: detail,
          cancel: { label: 'Schließen', onClick: () => {} },
          duration: Infinity,
        });
      }
    } catch {
      setScraperStatus('error');
      toast.error('Verbindungsfehler — der Backend-Server ist nicht erreichbar', {
        description:
          'Der Scraper-Lauf konnte nicht gestartet werden. '
          + 'Prüfe, ob der Backend-Container läuft (docker compose ps).',
        cancel: { label: 'Schließen', onClick: () => {} },
        duration: Infinity,
      });
    }
  }, [maxResults, reload]);

  const [batchDedupStatus, setBatchDedupStatus] = useState<ReReadStatus>('idle');
  const [batchDedupResult, setBatchDedupResult] = useState<string | null>(null);

  const handleBatchDedup = useCallback(async () => {
    setBatchDedupStatus('running');
    setBatchDedupResult(null);
    const toastId = toast.loading('Komplett-Reset läuft…', {
      description: 'Projekte werden gelöscht, Rohdaten zurückgesetzt.',
    });
    try {
      const result = await runBatchDedup();
      if (result.status === 'completed') {
        setBatchDedupResult(`${result.projects_deleted} gelöscht`);
        setBatchDedupStatus('done');
        toast.success('Komplett-Reset abgeschlossen', {
          id: toastId,
          description: `${result.projects_deleted} Projekte gelöscht. Jetzt "Scrapen + normalisieren" klicken.`,
          duration: 8000,
        });
      } else {
        setBatchDedupStatus('error');
        setBatchDedupResult('Fehler');
        toast.error('Komplett-Reset fehlgeschlagen', {
          id: toastId,
          description: 'Prüfe die Docker-Logs (docker compose logs backend) für die genaue Ursache.',
          cancel: { label: 'Schließen', onClick: () => {} },
          duration: Infinity,
        });
      }
      reload();
    } catch {
      setBatchDedupStatus('error');
      setBatchDedupResult('Fehler');
      setPage(0);
      toast.error('Komplett-Reset fehlgeschlagen', {
        id: toastId,
        description: 'Prüfe die Docker-Logs (docker compose logs backend) für die genaue Ursache.',
        cancel: { label: 'Schließen', onClick: () => {} },
        duration: Infinity,
      });
    }
  }, [reload, setPage]);

  return {
    scraperStatus,
    maxResults,
    setMaxResults,
    savedCount,
    batchDedupStatus,
    batchDedupResult,
    handleScrape,
    handleBatchDedup,
  };
}
