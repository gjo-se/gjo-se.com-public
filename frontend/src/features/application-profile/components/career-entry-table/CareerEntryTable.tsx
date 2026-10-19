/**
 * CareerEntryTable – Drag&Drop-fähige Admin-Tabelle für die Karriere.
 *
 * Nutzt die geteilten Tabellen-Bausteine `SortableTable` + `useGhostEditor`.
 *
 * - Drag-Handle (⋮⋮) pro Zeile → Reihenfolge per DnD ändern (sort wird persistiert)
 * - Inline-Edit: company, project_url, start/end (DateInput), Beschreibung DE/EN
 * - Ghost Row (Cmd+Enter) mit Pflichtfeld-Validierung (position, start_date)
 * - Row-Actions: Löschen (mit Dialog)
 * - Suche (client-seitig); bei aktiver Suche ist das Ziehen deaktiviert
 */
import { cva } from 'class-variance-authority';
import { useCallback } from 'react';

import Text from '@src/components/primitives/Text';
import { SortableTable } from '@src/components/table/SortableTable';
import TableToolbar from '@src/components/table/TableToolbar';
import { useGhostEditor } from '@src/components/table/useGhostEditor';

import { useCareerEntryTable } from '../../hooks/useCareerEntryTable';
import { CAREER_COLUMNS, validateCareerGhost } from '../../utils/careerEntryColumns';

import CareerGhostRow from './CareerGhostRow';
import CareerSortableRow from './CareerSortableRow';

/** Ghost row starts empty (validation drives required fields). */
const GHOST_DEFAULTS: Record<string, string> = {};

const overlayVariants = cva(
  'rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900',
);

/** Drag&Drop-fähige Karriere-Tabelle mit Such-Toolbar, Inline-Edit und Ghost Row. */
export default function CareerEntryTable() {
  const {
    rows,
    totalCount,
    search,
    setSearch,
    sortableEnabled,
    loading,
    error,
    onGhostCreate,
    onFieldSave,
    handleReorder,
    handleDelete,
  } = useCareerEntryTable();

  const ghost = useGhostEditor(
    GHOST_DEFAULTS,
    validateCareerGhost,
    useCallback(
      async (data) => {
        try {
          await onGhostCreate(data);
          return null;
        } catch (err: unknown) {
          return err instanceof Error ? err.message : 'Fehler beim Erstellen.';
        }
      },
      [onGhostCreate],
    ),
  );

  return (
    <section>
      <SortableTable
        items={rows}
        columns={CAREER_COLUMNS}
        getRowId={(row) => row.id}
        onReorder={(ids) => handleReorder(ids as number[])}
        loading={loading}
        errorText={error}
        sortableEnabled={sortableEnabled}
        container={false}
        emptyText="Keine Karriere-Stationen vorhanden."
        toolbar={(
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            onReset={() => setSearch('')}
            total={totalCount}
            loading={loading}
            searchPlaceholder="Suche nach Position oder Firma…"
          >
            <Text size="sm" color="muted">
              {sortableEnabled ? 'Zum Sortieren Zeilen ziehen.' : 'Suche aktiv – Sortieren deaktiviert.'}
            </Text>
          </TableToolbar>
        )}
        renderOverlay={(row) => (
          <div className={overlayVariants()}>
            <Text as="span" size="sm" weight="medium">
              {row.position}
            </Text>
            {row.company && (
              <Text as="span" size="sm" color="muted">
                {' · '}{row.company}
              </Text>
            )}
          </div>
        )}
        renderRow={(row) => (
          <CareerSortableRow
            key={row.id}
            row={row}
            sortableEnabled={sortableEnabled}
            onFieldSave={onFieldSave}
            onDelete={handleDelete}
          />
        )}
        ghostOpen={ghost.open}
        ghostRow={
          ghost.open ? (
            <CareerGhostRow
              saving={ghost.saving}
              data={ghost.data}
              onChange={ghost.onFieldChange}
              onSubmit={ghost.submitGhost}
            />
          ) : undefined
        }
        ghostError={ghost.error}
      />
    </section>
  );
}
