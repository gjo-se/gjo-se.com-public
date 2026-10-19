/**
 * SkillGroupAdminTab – Admin table for curated FBF skill groups.
 *
 * Nutzt die geteilten Tabellen-Bausteine `SortableTable`, `useGhostEditor` und
 * `DeleteConfirmDialog` (Drag&Drop-Markup, Ghost-Controller, Lösch-Dialog).
 *
 * - Drag-Handle (⋮⋮) pro Zeile → Reihenfolge per DnD ändern (POST reorder)
 * - Inline-Edit: Label DE/EN (je Locale)
 * - Prio (high/medium) als NativeSelect
 * - Delete mit Dialog-Bestätigung (DELETE /admin/fbf/skill-group/{id})
 */

import { useCallback, useEffect, useState } from 'react';

import Text from '@src/components/primitives/Text';
import { DeleteConfirmDialog } from '@src/components/table/DeleteConfirmDialog';
import { SortableTable } from '@src/components/table/SortableTable';
import { useGhostEditor } from '@src/components/table/useGhostEditor';
import { showErrorToast } from '@src/lib/errorToast';

import {
  createSkillGroup,
  deleteSkillGroup,
  fetchAdminSkillGroups,
  reorderSkillGroups,
  updateSkillGroup,
} from '../../services/skillGroupsAdmin';
import { GROUP_COLUMNS, validateGhost } from '../../utils/skillGroupAdminTabColumns';
import SkillGroupSkillSortDialog from '../skill-group-skill-sort-dialog/SkillGroupSkillSortDialog';

import SkillGroupDragOverlayRow from './SkillGroupDragOverlayRow';
import SkillGroupGhostRow from './SkillGroupGhostRow';
import SkillGroupSortableRow from './SkillGroupSortableRow';

import type { SkillGroupAdminRow, SkillGroupPriority } from '../../utils/skillGroupAdminTypes';

// ── Ghost defaults ───────────────────────────────────────────────────────

const GHOST_DEFAULTS: Record<string, string> = {
  label_de: '',
  label_en: '',
  priority: 'medium',
};

// ── Component ────────────────────────────────────────────────────────────

/** Renders the skill-group management table (DnD + inline-edit + delete). */
export default function SkillGroupAdminTab() {
  const [groups, setGroups] = useState<SkillGroupAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAdminSkillGroups();
      setGroups(data.map(toRow));
      setError(null);
    } catch {
      setError('Fehler beim Laden der Skill-Gruppen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ── Reorder (optimistic + persist) ─────────────────────────────────────
  const handleReorder = useCallback(
    async (orderedIds: number[]) => {
      setGroups((prev) =>
        orderedIds
          .map((id) => prev.find((group) => group.id === id))
          .filter((group): group is SkillGroupAdminRow => group !== undefined),
      );
      try {
        await reorderSkillGroups(orderedIds);
        await reload();
      } catch {
        showErrorToast('Fehler beim Speichern der Reihenfolge.');
        await reload();
      }
    },
    [reload],
  );

  // ── Edits ──────────────────────────────────────────────────────────────
  const handleLabelSave = useCallback(
    async (row: SkillGroupAdminRow, locale: 'de' | 'en', value: string) => {
      try {
        await updateSkillGroup(row.id, { labels: { de: row.label_de, en: row.label_en, [locale]: value } });
        void reload();
      } catch {
        showErrorToast(`Fehler beim Speichern des Labels (${locale.toUpperCase()}).`);
      }
    },
    [reload],
  );

  const handlePriorityChange = useCallback(
    async (row: SkillGroupAdminRow, priority: SkillGroupPriority) => {
      if (row.priority === priority) return;
      try {
        await updateSkillGroup(row.id, { priority });
        void reload();
      } catch {
        showErrorToast('Fehler beim Speichern der Priorität.');
      }
    },
    [reload],
  );

  // ── Delete with Dialog ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [sortTarget, setSortTarget] = useState<SkillGroupAdminRow | null>(null);

  const confirmDelete = useCallback(
    async (groupId: number) => {
      try {
        await deleteSkillGroup(groupId);
        setDeleteTarget(null);
        void reload();
      } catch {
        setDeleteTarget(null);
        showErrorToast('Fehler beim Löschen der Gruppe (ggf. sind noch Skills zugeordnet).');
      }
    },
    [reload],
  );

  // ── Ghost Row (create) ─────────────────────────────────────────────────
  const ghost = useGhostEditor(
    GHOST_DEFAULTS,
    validateGhost,
    useCallback(
      async (data) => {
        try {
          await createSkillGroup({
            labels: { de: data.label_de, en: data.label_en },
            priority: toPriority(data.priority ?? 'medium'),
          });
          void reload();
          return null;
        } catch {
          return 'Fehler beim Anlegen der Skill-Gruppe.';
        }
      },
      [reload],
    ),
  );

  // ── Render ─────────────────────────────────────────────────────────────
  if (error) {
    return <Text as="p" size="sm" color="error">{error}</Text>;
  }

  return (
    <section>
      <SortableTable
        label="Skill-Gruppen"
        items={groups}
        columns={GROUP_COLUMNS}
        getRowId={(group) => group.id}
        onReorder={(ids) => handleReorder(ids as number[])}
        loading={loading}
        renderOverlay={(group) => <SkillGroupDragOverlayRow row={group} />}
        renderRow={(group) => (
          <SkillGroupSortableRow
            key={group.id}
            row={group}
            onDelete={(id) => setDeleteTarget(id)}
            onLabelSave={handleLabelSave}
            onPriorityChange={handlePriorityChange}
            onSort={setSortTarget}
          />
        )}
        emptyText="Keine Skill-Gruppen vorhanden."
        ghostOpen={ghost.open}
        ghostRow={
          ghost.open ? (
            <SkillGroupGhostRow
              saving={ghost.saving}
              data={ghost.data}
              onChange={ghost.onFieldChange}
              onSubmit={ghost.submitGhost}
              error={ghost.error}
            />
          ) : undefined
        }
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Skill-Gruppe löschen"
        description="Diese Skill-Gruppe wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget !== null) void confirmDelete(deleteTarget);
        }}
      />
      {sortTarget && (
        <SkillGroupSkillSortDialog
          open={sortTarget !== null}
          onOpenChange={(open) => {
            if (!open) setSortTarget(null);
          }}
          groupId={sortTarget.id}
          groupLabel={sortTarget.label_de || sortTarget.label_en}
        />
      )}
    </section>
  );
}

/** Guard: erhält alle drei Prioritäts-Stufen aus der API (Fallback `medium`). */
function toPriority(value: string): SkillGroupPriority {
  if (value === 'high' || value === 'base') return value;
  return 'medium';
}

/** Flattens the API's `labels` dict into dedicated locale columns for the table. */
function toRow(g: {
  id: number;
  sort: number;
  priority: string;
  labels: Record<string, string>;
  skill_count?: number;
}): SkillGroupAdminRow {
  return {
    id: g.id,
    sort: g.sort,
    priority: toPriority(g.priority),
    label_de: g.labels?.de ?? '',
    label_en: g.labels?.en ?? '',
    skillCount: g.skill_count ?? 0,
  };
}
