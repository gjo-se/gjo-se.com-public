/**
 * Description tabs of the ProjectComparisonTable – the merged summary tab
 * (with inline-explain context menu) plus one tab per project.
 */
import { useCallback, useState } from 'react';

import Alert from '@src/components/primitives/Alert';
import Button from '@src/components/primitives/Button';
import ContextMenu from '@src/components/primitives/ContextMenu/ContextMenu';
import ContextMenuContent from '@src/components/primitives/ContextMenu/ContextMenuContent';
import ContextMenuItem from '@src/components/primitives/ContextMenu/ContextMenuItem';
import ContextMenuTrigger from '@src/components/primitives/ContextMenu/ContextMenuTrigger';
import Dialog, { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@src/components/primitives/Dialog';
import Markdown from '@src/components/primitives/Markdown';
import NavButton from '@src/components/primitives/NavButton';
import Separator from '@src/components/primitives/Separator';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { inlineExplain } from '@src/lib/api/aiscope';
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

import { containerCls, headerStripCls } from '../ProjectDetailView/ProjectDetailView.constants';

import { COL_MAX_W, COL_MIN_W, LABEL_W } from './ProjectComparisonTable.constants';
import {
  pctDirtyDotVariants,
  pctMergeLoadingVariants,
  pctTabBarVariants,
  pctTabContentVariants,
} from './ProjectComparisonTable.variants';

import type { MouseEvent } from 'react';

/** Props of the description tabs. */
export interface ProjectComparisonDescriptionTabsProps {
  columns: ComparisonColumn[];
  colWidths: number[];
  mergeDirty: boolean;
  merging: boolean;
  mergedDescription: string | null;
  streamingText: string | null;
  onMerge?: () => void;
}

/** Renders the summary/description tabs with the inline-explain dialog. */
export default function ProjectComparisonDescriptionTabs({
  columns,
  colWidths,
  mergeDirty,
  merging,
  mergedDescription,
  streamingText,
  onMerge,
}: ProjectComparisonDescriptionTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [explainState, setExplainState] = useState<{
    open: boolean;
    term: string;
    explanation: string | null;
    loading: boolean;
    error: string | null;
  }>({ open: false, term: '', explanation: null, loading: false, error: null });

  const handleContextMenu = useCallback((_e: MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    if (text.length > 0 && text.length <= 200) {
      setSelectedTerm(text);
    } else {
      setSelectedTerm(null);
    }
  }, []);

  const handleExplain = useCallback(async (term: string) => {
    setExplainState({ open: true, term, explanation: null, loading: true, error: null });
    try {
      const result = await inlineExplain({ term, context: mergedDescription ?? '' });
      setExplainState(prev => ({ ...prev, explanation: result.explanation, loading: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setExplainState(prev => ({ ...prev, error: message, loading: false }));
    }
  }, [mergedDescription]);

  return (
    <>
      {/* Description tabs – widths measured from metadata table via ResizeObserver */}
      <Separator spacing="my-6" />
      <section className="pct-wrapper">
        <div className={containerCls}>
          <div className={headerStripCls}>
            <Text as="span" size="xs" weight="medium" uppercase color="muted">
              Beschreibung
            </Text>
          </div>
          {/* Tab bar */}
          <div className={pctTabBarVariants()}>
            {/* Tab 0: Zusammenfassung – width matches label column */}
            <div
              className="flex-shrink-0"
              style={{ minWidth: colWidths[0] ?? LABEL_W, maxWidth: colWidths[0] ?? LABEL_W }}
            >
              <NavButton
                variant={
                  activeTab === 0
                    ? mergeDirty ? 'tab-dirty-active' : 'tab-active'
                    : mergeDirty ? 'tab-dirty' : 'tab'
                }
                onClick={() => setActiveTab(0)}
                label={(
                  <>
                    Zusammenf.
                    {mergeDirty && (
                      <div className={pctDirtyDotVariants()} />
                    )}
                  </>
                )}
              />
            </div>
            {/* Tabs 1..n: Master + Slaves – each matches its data column width */}
            {columns.map((col, i) => {
              const tabIndex = i + 1;
              const isActive = activeTab === tabIndex;
              // colWidths: [labelCol, masterCol, slave1Col, slave2Col, ...]
              // Tab 0 → labelCol (index 0), Tab 1 → masterCol (index 1), ...
              const w = colWidths[tabIndex];
              return (
                <div
                  key={col.id}
                  className="flex-shrink-0"
                  style={{
                    minWidth: w ?? COL_MIN_W,
                    maxWidth: w ?? COL_MAX_W,
                  }}
                >
                  <NavButton
                    variant={isActive ? 'tab-active' : 'tab'}
                    onClick={() => setActiveTab(tabIndex)}
                    label={col.canonical ? `#${col.id}` : `#${col.id} (${col.scoreLabel})`}
                  />
                </div>
              );
            })}
          </div>
          {/* Tab content */}
          <div className={pctTabContentVariants()}>
            {activeTab === 0 ? (
              <div className="space-y-3">
                {/* Merge control: CTA when stale, subtle re-run otherwise */}
                <div className="flex items-center justify-between gap-3">
                  {mergeDirty ? (
                    <Text as="span" size="sm" color="muted">
                      Gruppe geändert – Zusammenfassung veraltet.
                    </Text>
                  ) : (
                    <Text as="span" />
                  )}
                  {onMerge && (
                    <Button
                      variant={mergeDirty ? 'default' : 'secondary'}
                      size="sm"
                      onClick={onMerge}
                      disabled={merging}
                    >
                      {merging && <Spinner size="sm" />}
                      {merging
                        ? 'Erstelle…'
                        : mergedDescription
                          ? 'Neu generieren'
                          : 'Zusammenfassung erstellen'}
                    </Button>
                  )}
                </div>

                {merging ? (
                  <div className="space-y-2">
                    <div className={pctMergeLoadingVariants()}>
                      <Spinner size="sm" />
                      <Text as="span" size="sm" color="muted">Zusammenfassung wird erstellt…</Text>
                    </div>
                    {streamingText ? <Markdown>{streamingText}</Markdown> : null}
                  </div>
                ) : mergedDescription ? (
                  <ContextMenu
                    {...({
                      onChange: (open: boolean) => { if (!open) setSelectedTerm(null); },
                    } as Record<string, unknown>)}
                  >
                    <ContextMenuTrigger>
                      <div onContextMenu={handleContextMenu}>
                        <Markdown>{mergedDescription}</Markdown>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {selectedTerm && (
                        <ContextMenuItem onClick={() => { void handleExplain(selectedTerm); }}>
                          Begriff erklären: {selectedTerm.length > 50
                            ? selectedTerm.slice(0, 50) + '…'
                            : selectedTerm}
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <Text as="span" size="sm" color="muted">Noch keine Zusammenfassung vorhanden.</Text>
                )}
              </div>
            ) : (
              (() => {
                const col = columns[activeTab - 1];
                return col?.description ? (
                  <Markdown>{col.description}</Markdown>
                ) : (
                  <Text as="span" size="sm" color="muted">Keine Beschreibung vorhanden.</Text>
                );
              })()
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={explainState.open}
        onOpenChange={(open) => {
          if (!open) setExplainState(prev => ({ ...prev, open }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erklärung: {explainState.term}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {explainState.loading && (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <Text as="span" size="sm">Begriff wird erklärt…</Text>
              </div>
            )}
            {explainState.error && <Alert variant="destructive">{explainState.error}</Alert>}
            {explainState.explanation && <Markdown>{explainState.explanation}</Markdown>}
          </DialogDescription>
          <DialogFooter>
            <DialogClose>Schließen</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
