/**
 * FocusAreaTable – Admin-Tabelle für die drei Hauptbereiche (AI / Architecture /
 * CleanCode).
 *
 * Nutzt den geteilten `SortableTable`-Baustein (ohne DnD).
 *
 * - Inline-Edit: slug / url, Titel DE/EN, Kurztext DE/EN (Textarea)
 * - Ghost Row (Cmd+Enter) mit Pflichtfeld-Validierung (slug, title_de)
 * - Row-Actions: Löschen (mit Dialog)
 * - Suche (client-seitig). Reihenfolge = `sort` (beim Create automatisch gesetzt)
 *   – bewusste MVP-Einschränkung, kein Drag&Drop.
 */
import { useCallback, useEffect, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import { GhostRowField } from '@src/components/table/GhostRowField';
import { SortableTable } from '@src/components/table/SortableTable';
import TableCell from '@src/components/table/TableCell';
import TableInlineEditCell from '@src/components/table/TableInlineEditCell';
import TableRowActions from '@src/components/table/TableRowActions';
import TableToolbar from '@src/components/table/TableToolbar';

import { useFocusAreaTable } from '../../hooks/useFocusAreaTable';
import { FOCUS_AREA_COLUMNS, validateFocusAreaGhost } from '../../utils/focusAreaColumns';

import type { FocusAreaRow } from '../../hooks/useFocusAreaTable';
import type { FocusAreaColumnDef, FocusAreaColumnKey } from '../../utils/focusAreaColumns';

/**
 *
 */
export default function FocusAreaTable() {
  const {
    rows,
    totalCount,
    search,
    setSearch,
    loading,
    error,
    onGhostCreate,
    onFieldSave,
    handleDelete,
  } = useFocusAreaTable();

  // ── Ghost row state ──────────────────────────────────────────────────
  const [ghostOpen, setGhostOpen] = useState(false);
  const [ghostData, setGhostData] = useState<Record<string, string>>({});
  const [ghostSaving, setGhostSaving] = useState(false);
  const [ghostError, setGhostError] = useState<string | null>(null);

  const openGhost = useCallback(() => {
    setGhostData({});
    setGhostError(null);
    setGhostOpen(true);
  }, []);

  const closeGhost = useCallback(() => {
    setGhostOpen(false);
    setGhostData({});
    setGhostError(null);
  }, []);

  const submitGhost = useCallback(async () => {
    if (ghostSaving) return;
    const validationError = validateFocusAreaGhost(ghostData);
    if (validationError) {
      setGhostError(validationError);
      return;
    }
    setGhostError(null);
    setGhostSaving(true);
    try {
      await onGhostCreate(ghostData);
      closeGhost();
    } catch (err: unknown) {
      setGhostError(err instanceof Error ? err.message : 'Fehler beim Erstellen.');
    } finally {
      setGhostSaving(false);
    }
  }, [ghostSaving, ghostData, onGhostCreate, closeGhost]);

  // Cmd+Enter opens ghost / submits when open. Scoped to the section (not a
  // global window listener) so it does not collide with the career table's
  // global Cmd+Enter handler on the same page. While typing inside an editable
  // element the shortcut is left alone (textareas already use Cmd+Enter to save).
  const handleSectionKeyDown = (e: React.KeyboardEvent) => {
    if (!((e.metaKey || e.ctrlKey) && e.key === 'Enter')) return;
    e.stopPropagation();
    if (ghostOpen) {
      e.preventDefault();
      void submitGhost();
      return;
    }
    const target = e.target as HTMLElement | null;
    const inEditable =
      target !== null &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (inEditable) return;
    e.preventDefault();
    openGhost();
  };

  // Escape closes ghost
  useEffect(() => {
    if (!ghostOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeGhost();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ghostOpen, closeGhost]);

  const handleGhostKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !ghostSaving) {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      e.preventDefault();
      void submitGhost();
    }
  };

  const renderGhostInput = (col: FocusAreaColumnDef) => {
    if (!col.ghost) return null;
    return (
      <GhostRowField
        ghost={col.ghost}
        value={ghostData[col.key] ?? ''}
        placeholder={col.ghostPlaceholder}
        disabled={ghostSaving}
        onValueChange={(value) => setGhostData((prev) => ({ ...prev, [col.key]: value }))}
        onKeyDown={handleGhostKeyDown}
      />
    );
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <section onKeyDown={handleSectionKeyDown}>
      <SortableTable
        items={rows}
        columns={FOCUS_AREA_COLUMNS}
        getRowId={(row) => row.id}
        sortableEnabled={false}
        container={false}
        loading={loading}
        errorText={error}
        emptyText="Keine Hauptbereiche vorhanden."
        toolbar={(
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            onReset={() => setSearch('')}
            total={totalCount}
            loading={loading}
            searchPlaceholder="Suche nach Slug oder Titel…"
          >
            <Button variant="secondary" size="sm" onClick={openGhost} disabled={ghostOpen}>
              Neu (⌘+Enter)
            </Button>
            <Text size="sm" color="muted">
              Slug und Titel (DE) sind Pflicht.
            </Text>
          </TableToolbar>
        )}
        renderRow={(row) => (
          <tr key={row.id} data-focus-area-id={row.id}>
            {FOCUS_AREA_COLUMNS.map((col) => {
              if (col.key === '_actions') {
                return (
                  <TableCell key={col.key} compact>
                    <TableRowActions
                      onDelete={() => handleDelete(row)}
                      deleteConfirmLabel="Hauptbereich wirklich löschen?"
                    />
                  </TableCell>
                );
              }
              return <TableCell key={col.key}>{renderCell(row, col.key, onFieldSave)}</TableCell>;
            })}
          </tr>
        )}
        ghostOpen={ghostOpen}
        ghostRow={
          ghostOpen ? (
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {FOCUS_AREA_COLUMNS.map((col) => (
                <TableCell key={col.key} compact={col.compact}>
                  {renderGhostInput(col)}
                </TableCell>
              ))}
            </tr>
          ) : undefined
        }
        ghostError={ghostError}
      />
    </section>
  );
}

/** Renders the inline-edit cell for a data column. */
function renderCell(
  row: FocusAreaRow,
  colKey: FocusAreaColumnKey,
  onFieldSave: (row: FocusAreaRow, field: string, value: string) => void | Promise<void>,
) {
  switch (colKey) {
    case 'slug':
      return <TableInlineEditCell value={row.slug} onSave={(v) => onFieldSave(row, 'slug', v)} />;
    case 'title_de':
      return (
        <TableInlineEditCell value={row.title_de ?? ''} onSave={(v) => onFieldSave(row, 'title_de', v)} />
      );
    case 'title_en':
      return (
        <TableInlineEditCell value={row.title_en ?? ''} onSave={(v) => onFieldSave(row, 'title_en', v)} />
      );
    case 'summary_de':
      return (
        <TableInlineEditCell
          value={row.summary_de ?? ''}
          textarea
          onSave={(v) => onFieldSave(row, 'summary_de', v)}
        />
      );
    case 'summary_en':
      return (
        <TableInlineEditCell
          value={row.summary_en ?? ''}
          textarea
          onSave={(v) => onFieldSave(row, 'summary_en', v)}
        />
      );
    case 'url':
      return <TableInlineEditCell value={row.url ?? ''} onSave={(v) => onFieldSave(row, 'url', v)} />;
    default:
      return null;
  }
}
