/**
 * ProofSubTable – Drag&Drop-fähige Tabelle für die 1:N-Beweise eines Portfolios.
 *
 * Nutzt die geteilten Tabellen-Bausteine `SortableTable`, `useGhostEditor` und
 * `DeleteConfirmDialog` (Drag&Drop-Markup, Ghost-Controller, Lösch-Dialog).
 *
 * Features:
 * - Drag-Handle (⋮⋮) pro Zeile → Reihenfolge per DnD ändern (sort wird persistiert)
 * - Inline-Edit: image_src (Textfeld mit Vorschau), statement (Textfeld je Locale)
 * - Ghost Row (Cmd+Enter) mit Pflichtfeld-Validierung (statement)
 * - Delete mit Dialog-Bestätigung
 * - Visuelles Feedback: halbtransparente Zeile während des Ziehens, DragOverlay
 * - Section-Header: "Proofs (N)"
 */

import { useCallback, useState } from 'react';

import Text from '@src/components/primitives/Text';
import { DeleteConfirmDialog } from '@src/components/table/DeleteConfirmDialog';
import { SortableTable } from '@src/components/table/SortableTable';
import { useGhostEditor } from '@src/components/table/useGhostEditor';

import { useProofSubTable } from '../../hooks/useProofSubTable';
import { PROOF_COLUMNS, validateGhost } from '../../utils/proofSubTableColumns';

import DragOverlayRow from './DragOverlayRow';
import GhostRow from './GhostRow';
import ProofSortableRow from './ProofSortableRow';

// ── Props ─────────────────────────────────────────────────────────────────

export interface ProofSubTableProps {
  slug: string;
  /** Aktive Locale ('de' | 'en') – steuert, welches Statement angezeigt/editiert wird. */
  locale: 'de' | 'en';
}

// ── Ghost defaults ───────────────────────────────────────────────────────

const GHOST_DEFAULTS: Record<string, string> = {
  image_src: '',
  statement: '',
  priority: 'medium',
};

// ── Main Component ───────────────────────────────────────────────────────

/** Drag&Drop-fähige Proof-Tabelle mit Inline-Edit, Ghost Row und Dialog-Delete. */
export default function ProofSubTable({ slug, locale }: ProofSubTableProps) {
  const {
    proofs,
    isLoading,
    error,
    handleCreate,
    handleDelete,
    handleInlineEdit,
    handleReorder,
    handleStatementSave,
    handleQuestionSave,
  } = useProofSubTable(slug, locale);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const ghost = useGhostEditor(
    GHOST_DEFAULTS,
    validateGhost,
    useCallback(
      async (data) => {
        const err = await handleCreate({
          image_src: data.image_src,
          statement: data.statement,
          priority: data.priority,
        });
        return err ?? null;
      },
      [handleCreate],
    ),
  );

  const confirmDelete = useCallback(
    async (proofId: number) => {
      await handleDelete(proofId);
      setDeleteTarget(null);
    },
    [handleDelete],
  );

  // ── Render ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="py-4">
        <Text size="sm" color="muted">
          Laden…
        </Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <Text size="sm" color="error">
          Fehler beim Laden der Proofs.
        </Text>
      </div>
    );
  }

  return (
    <section>
      <SortableTable
        label="Proofs"
        items={proofs}
        columns={PROOF_COLUMNS}
        getRowId={(proof) => proof.id}
        onReorder={(ids) => handleReorder(ids as number[])}
        renderOverlay={(proof) => <DragOverlayRow proof={proof} />}
        renderRow={(proof) => (
          <ProofSortableRow
            key={proof.id}
            proof={proof}
            locale={locale}
            uploadPrefix={`portfolio/${slug}`}
            onDelete={(id) => setDeleteTarget(id)}
            onInlineEdit={handleInlineEdit}
            onStatementSave={handleStatementSave}
            onQuestionSave={handleQuestionSave}
          />
        )}
        emptyText="Keine Proofs vorhanden."
        ghostOpen={ghost.open}
        ghostRow={
          ghost.open ? (
            <GhostRow
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

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Proof löschen"
        description="Dieser Proof wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget !== null) void confirmDelete(deleteTarget);
        }}
      />
    </section>
  );
}
