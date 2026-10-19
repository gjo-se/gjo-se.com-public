/**
 * PortfolioAdminTable – Drag&Drop-fähige Tabelle für die Portfolio-Admin-Liste.
 *
 * Nutzt die geteilten Tabellen-Bausteine `SortableTable` + `useGhostEditor`.
 *
 * - Drag-Handle (⋮⋮) pro Zeile → Reihenfolge per DnD ändern (sort wird persistiert)
 * - Inline-Edit: year, link_url, link_label
 * - Ghost Row (Cmd+Enter) mit Pflichtfeld-Validierung (slug)
 * - Row-Actions: Bearbeiten (→ DetailPage), Löschen (mit Dialog)
 * - Suche (server-seitig via q); bei aktiver Suche ist das Ziehen deaktiviert
 */

import { useCallback } from 'react';

import Text from '@src/components/primitives/Text';
import { SortableTable } from '@src/components/table/SortableTable';
import TableToolbar from '@src/components/table/TableToolbar';
import { useGhostEditor } from '@src/components/table/useGhostEditor';

import { PORTFOLIO_COLUMNS, validateGhost } from '../../utils/portfolioAdminTableColumns';

import PortfolioDragOverlayRow from './PortfolioDragOverlayRow';
import PortfolioGhostRow from './PortfolioGhostRow';
import PortfolioSortableRow from './PortfolioSortableRow';

import type { PortfolioAdminRow } from '../../hooks/usePortfolioAdminTable';

// ── Props ─────────────────────────────────────────────────────────────────

export interface PortfolioAdminTableProps {
  portfolios: PortfolioAdminRow[];
  isLoading: boolean;
  error: string | null;
  /** Aktiver Suchbegriff (server-seitig). */
  search: string;
  onSearchChange: (value: string) => void;
  handleReorder: (orderedSlugs: string[]) => Promise<string | null>;
  handleDelete: (slug: string) => Promise<string | null>;
  handleEdit: (row: PortfolioAdminRow) => void;
  onGhostCreate: (data: Record<string, string>) => Promise<string | null>;
}

// ── Ghost defaults ───────────────────────────────────────────────────────

const GHOST_DEFAULTS: Record<string, string> = {
  slug: '',
};

// ── Main Component ───────────────────────────────────────────────────────

/** Drag&Drop-fähige Portfolio-Tabelle mit Suche, Inline-Edit und Ghost Row. */
export default function PortfolioAdminTable({
  portfolios,
  isLoading,
  error,
  search,
  onSearchChange,
  handleReorder,
  handleDelete,
  handleEdit,
  onGhostCreate,
}: PortfolioAdminTableProps) {
  // Ziehen nur ohne aktive Suche erlauben (sonst inkorrekte sort-Indizes).
  const sortableEnabled = !search.trim();

  const ghost = useGhostEditor(
    GHOST_DEFAULTS,
    validateGhost,
    useCallback(
      async (data) => {
        const err = await onGhostCreate(data);
        return err ?? null;
      },
      [onGhostCreate],
    ),
  );

  return (
    <section>
      <SortableTable
        label="Projekte"
        items={portfolios}
        columns={PORTFOLIO_COLUMNS}
        getRowId={(row) => row.slug}
        onReorder={(ids) => handleReorder(ids.map(String))}
        loading={isLoading}
        errorText={error}
        sortableEnabled={sortableEnabled}
        emptyText="Keine Projekte vorhanden."
        toolbar={(
          <TableToolbar
            searchValue={search}
            onSearchChange={onSearchChange}
            onReset={() => onSearchChange('')}
            total={portfolios.length}
            loading={isLoading}
            searchPlaceholder="Suche nach Slug oder Titel…"
          >
            <Text size="sm" color="muted">
              {sortableEnabled ? 'Zum Sortieren Zeilen ziehen.' : 'Suche aktiv – Sortieren deaktiviert.'}
            </Text>
          </TableToolbar>
        )}
        renderOverlay={(row) => <PortfolioDragOverlayRow row={row} />}
        renderRow={(row) => (
          <PortfolioSortableRow
            key={row.slug}
            row={row}
            sortableEnabled={sortableEnabled}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        ghostOpen={ghost.open}
        ghostRow={
          ghost.open ? (
            <PortfolioGhostRow
              saving={ghost.saving}
              data={ghost.data}
              onChange={ghost.onFieldChange}
              onSubmit={ghost.submitGhost}
              error={ghost.error}
            />
          ) : undefined
        }
        ghostError={ghost.error}
      />
    </section>
  );
}
