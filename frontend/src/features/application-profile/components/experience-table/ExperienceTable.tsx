/**
 * ExperienceTable – Drag&Drop-fähige Admin-Tabelle für die Projekte (ProjectList).
 *
 * Nutzt den geteilten `SortableTable`-Baustein.
 *
 * - @dnd-kit-Sortable-Zeilen → Reihenfolge ändern (persistiert `sort`)
 * - Ghost Row „Neues Projekt" (Klick oder Cmd+Enter)
 * - Zeilen-Action (Bearbeiten) + Löschen (mit Confirm)
 *
 * Anders als Career haben Projekte viele Felder, deshalb läuft das Pflegen
 * über ein Overlay (`ExperienceDialog`). Ghost Row und Bearbeiten-Action rufen
 * `openOverlay` auf, das den Dialog mit Create-/Edit-Kontext öffnet.
 */
import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import { SortableTable } from '@src/components/table/SortableTable';
import TableCell from '@src/components/table/TableCell';
import type { ExperienceOut } from '@src/lib/api/applicationProfile';

import { useExperienceTable } from '../../hooks/useExperienceTable';
import { EXPERIENCE_COLUMNS } from '../../utils/experienceColumns';
import ExperienceDialog from '../experience-dialog/ExperienceDialog';

import ExperienceSortableRow from './ExperienceSortableRow';


const overlayVariants = cva(
  'rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900',
);

/** Experience projects admin table with DnD sorting and overlay trigger. */
export default function ExperienceTable() {
  const { experiences, loading, error, remove, reorder, reload } = useExperienceTable();

  // ── Overlay state ────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ExperienceOut | null>(null);

  const openOverlay = useCallback((experience: ExperienceOut | null) => {
    setSelected(experience);
    setDialogOpen(true);
  }, []);

  // Cmd+Enter öffnet das Overlay im Create-Modus. Scoped auf die Sektion
  // (nicht global), damit es nicht mit dem globalen Career-Shortcut kollidiert.
  const handleSectionKeyDown = (e: React.KeyboardEvent) => {
    if (!((e.metaKey || e.ctrlKey) && e.key === 'Enter')) return;
    e.stopPropagation();
    const target = e.target as HTMLElement | null;
    const inEditable =
      target !== null &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (inEditable) return;
    e.preventDefault();
    openOverlay(null);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <section onKeyDown={handleSectionKeyDown}>
      <SortableTable
        items={experiences}
        columns={EXPERIENCE_COLUMNS}
        getRowId={(row) => row.id}
        onReorder={(ids) => reorder(ids as number[])}
        loading={loading}
        errorText={error}
        container={false}
        emptyText="Keine Projekte vorhanden."
        renderOverlay={(row) => (
          <div className={overlayVariants()}>
            <Text as="span" size="sm" weight="medium">
              {row.position}
            </Text>
          </div>
        )}
        renderRow={(row) => (
          <ExperienceSortableRow key={row.id} row={row} onEdit={openOverlay} onDelete={remove} />
        )}
        ghostRow={(
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            <TableCell colSpan={EXPERIENCE_COLUMNS.length}>
              <Button variant="ghost" size="sm" onClick={() => openOverlay(null)}>
                ＋ Neues Projekt (⌘+Enter)
              </Button>
            </TableCell>
          </tr>
        )}
      />

      <ExperienceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        experience={selected}
        onSaved={reload}
      />
    </section>
  );
}
