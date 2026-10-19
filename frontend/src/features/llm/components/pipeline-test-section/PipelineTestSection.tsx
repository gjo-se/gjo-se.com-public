import { useCallback, useRef, useState } from 'react';

import Accordion from '@src/components/primitives/Accordion';
import Button from '@src/components/primitives/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@src/components/primitives/Card';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { searchProjects } from '@src/lib/api/aiscope';
import type { Project } from '@src/lib/api/aiscope';
import { getPipelineResult } from '@src/lib/api/aiscopeEndcustomer';
import { postResearchEndcustomer } from '@src/lib/api/aiscopeTasks';

import { usePipelineTest } from '../../hooks/usePipelineTest';
import PipelineActCard from '../pipeline-act-card/PipelineActCard';

import { CONTROL_COLUMN, OPTION_ROW, PROJECT_COLUMN, TRUNCATE } from './constants';

// ── Props ────────────────────────────────────────────────────────────────────

export interface PipelineTestSectionProps {
  taskKey: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PROJECT_LIMIT = 10;

// ── Component ────────────────────────────────────────────────────────────────

/**
 *
 */
export default function PipelineTestSection({ taskKey }: PipelineTestSectionProps) {
  const deps = { triggerResearch: postResearchEndcustomer, fetchPipelineResult: getPipelineResult };
  const {
    actOptions,
    selectedAct,
    setSelectedAct,
    selectedProjectId,
    setSelectedProjectId,
    running,
    result,
    handleRun,
    error,
    taskId,
  } = usePipelineTest(taskKey, deps);

  // ── Project combobox state ──────────────────────────────────────────────────
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleProjectSearch = useCallback((val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setProjectResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setProjectLoading(true);
      searchProjects(val.trim(), PROJECT_LIMIT)
        .then((items) => {
          setProjectResults(items);
          // Auto-select when exactly one result
          if (items.length === 1) {
            const p = items[0];
            setSelectedValue(String(p.id));
            setSelectedProjectId(p.id);
            setSearchQuery(`${p.title} (#${p.id})`);
          }
        })
        .catch(() => setProjectResults([]))
        .finally(() => setProjectLoading(false));
    }, 300);
  }, [setSelectedProjectId]);

  const handleProjectSelect = useCallback((newValue: string | null) => {
    if (!newValue) return;
    setSelectedValue(newValue);
    const target = projectResults.find((p) => String(p.id) === newValue);
    if (target) {
      setSelectedProjectId(target.id);
      setSearchQuery(`${target.title} (#${target.id})`);  // show selected project inside the input
    }
  }, [projectResults, setSelectedProjectId]);

  // ── Accordion items ────────────────────────────────────────────────────────
  const acts = result?.acts ?? {};
  const accordionItems = result
    ? Object.entries(acts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([key, act]) => ({
          id: key,
          title: `${act.name} ${act.status === 'done' ? '✅' : act.status === 'failed' ? '❌' : ''} ${act.duration_ms != null ? `(${act.duration_ms < 1000 ? `${act.duration_ms}ms` : `${(act.duration_ms / 1000).toFixed(1)}s`})` : ''}`,
          content: <PipelineActCard act={act} />,
        }))
    : [];

  // Guard: only show for endcustomer tasks
  if (!taskKey.startsWith('endcustomer-')) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline-Test</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          {/* Act selector */}
          <div className={CONTROL_COLUMN}>
            <Text as="label" size="xs" weight="medium" color="muted">
              Pipeline-Umfang
            </Text>
            <select
              value={selectedAct ?? ''}
              onChange={(e) => setSelectedAct(e.target.value ? Number(e.target.value) : null)}
              disabled={running}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">-- Bitte wählen --</option>
              {actOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Project combobox */}
          <div className={PROJECT_COLUMN}>
            <Text as="label" size="xs" weight="medium" color="muted">
              Projekt
            </Text>
            <Combobox
              value={selectedValue}
              onValueChange={handleProjectSelect}
            >
              <ComboboxInput
                placeholder="Projekt suchen…"
                value={searchQuery}
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setSearchQuery(val);
                  handleProjectSearch(val);
                  // Reset selection when user types
                  if (selectedValue) {
                    setSelectedValue('');
                    setSelectedProjectId(null);
                  }
                }}
                disabled={running}
              />
              <ComboboxContent>
                <ComboboxList>
                  {projectLoading && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Spinner />
                      <Text size="xs" color="muted">Suchen…</Text>
                    </div>
                  )}
                  {!projectLoading && projectResults.length === 0 && searchQuery.trim() && (
                    <ComboboxEmpty>
                      <Text size="xs" color="muted">Keine Projekte gefunden.</Text>
                    </ComboboxEmpty>
                  )}
                  {projectResults.map((p) => (
                    <ComboboxItem key={p.id} value={String(p.id)}>
                      <div className={OPTION_ROW}>
                        <div className={TRUNCATE}>
                          <Text size="sm">{p.title}</Text>
                        </div>
                        <Text size="xs" color="muted">#{p.id}</Text>
                      </div>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Run button */}
          <Button
            onClick={() => { void handleRun(); }}
            disabled={running || selectedAct == null || selectedProjectId == null}
            loading={running}
            size="sm"
          >
            {running ? 'Läuft…' : '▶ Start'}
          </Button>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-3">
            <Text size="sm" color="error">
              {error}
            </Text>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {!result && !running && !error && (
          <Text size="sm" color="muted">
            Wähle einen Act und ein Projekt, dann klicke Start.
          </Text>
        )}

        {/* ── Loading ────────────────────────────────────────────────────────── */}
        {running && (
          <div className="flex items-center gap-2 py-4">
            <Spinner />
            <Text size="sm" color="muted">
              Pipeline läuft{taskId ? ` (${taskId.slice(0, 12)}…)` : ''}…
            </Text>
          </div>
        )}

        {/* ── Results ────────────────────────────────────────────────────────── */}
        {result && accordionItems.length > 0 && (
          <div className="mt-2">
            <div className="mb-2">
              <Text size="xs" weight="medium" color="muted" uppercase>
                {result.phase === 'stopped'
                  ? `Gestoppt nach Act ${result.stopped_at_act}`
                  : result.phase === 'done'
                    ? 'Vollständig'
                    : `Status: ${result.phase}`}
              </Text>
            </div>
            <Accordion items={accordionItems} />
          </div>
        )}

        {/* ── No results after completion ────────────────────────────────────── */}
        {result && accordionItems.length === 0 && (
          <Text size="sm" color="muted">
            Keine Ergebnis-Daten verfügbar.
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
