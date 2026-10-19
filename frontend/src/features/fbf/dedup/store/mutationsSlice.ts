/**
 * mutationsSlice.ts – API mutation actions for the dedup board.
 */

import {
  activateMaster,
  archiveSkills,
  assignSlave,
  bulkAction,
  dissolveGroup,
  fetchBoard,
  unassignSkills,
  updateSkillName,
  type BulkAction,
} from '../services/dedup';

import type { DedupState } from './types';
import type { StateCreator } from 'zustand';

interface MutateOptions {
  /** Refetch pinned master slaves in addition to masters/slaves. */
  refetchPinned?: boolean
  /** Clear the current selection after the mutation (default true). */
  clearSelection?: boolean
  /** Trigger auto-advance after a successful mutation. */
  autoAdvance?: boolean
  /** When set, log the caught error under this label. */
  logError?: string
}

export interface MutationsSlice {
  doAssignSlave: (skillId: number, masterId: number) => Promise<void>
  doActivateMaster: (masterId: number, slaveIds: number[]) => Promise<void>
  doArchiveSkills: (skillIds: number[]) => Promise<void>
  doUnassignSkills: (skillIds: number[]) => Promise<void>
  doBulkAction: (action: BulkAction, skillIds: number[], masterId?: number) => Promise<void>
  doRenameSkill: (skillId: number, name: string) => Promise<void>
  doGroupStatus: (masterId: number, status: BulkAction) => Promise<void>
  doDissolveGroup: (masterId: number) => Promise<void>
  doBulkDissolveGroups: (masterIds: number[]) => Promise<void>
}

export const createMutationsSlice: StateCreator<DedupState, [], [], MutationsSlice> = (set, get) => {
  /** Shared skeleton for dedup board mutations (loading/error + refetch + selection). */
  const mutate = async (
    apiCall: () => Promise<unknown>,
    errorMessage: string,
    {
      refetchPinned = true,
      clearSelection = true,
      autoAdvance = false,
      logError,
    }: MutateOptions = {},
  ): Promise<void> => {
    set({ loading: true, error: null });
    try {
      await apiCall();
      await Promise.all(
        refetchPinned
          ? [get().fetchMasters(), get().fetchSlaves(), get().fetchPinnedMasterSlaves()]
          : [get().fetchMasters(), get().fetchSlaves()],
      );
      if (clearSelection) get().clearSelection();
      set({ loading: false });
      if (autoAdvance) void get().tryAutoAdvance();
    } catch (err) {
      if (logError) console.error(logError, err);
      set({ error: errorMessage, loading: false });
    }
  };

  return {
    doAssignSlave: async (skillId, masterId) => {
      set({ loading: true, error: null });
      try {
        await assignSlave(skillId, masterId);
        await Promise.all([get().fetchMasters(), get().fetchSlaves()]);
        const master = get().masters?.items.find(i => i.id === masterId);
        if (master) get().pinItem(master);
        get().clearSelection();
        get().refreshSimilarMasters();
        set({ loading: false });
        void get().tryAutoAdvance();
      } catch {
        set({ error: 'Fehler beim Zuordnen des Slaves.', loading: false });
      }
    },

    doActivateMaster: async (masterId, slaveIds) => {
      await mutate(() => activateMaster(masterId, slaveIds), 'Fehler beim Aktivieren.', {
        autoAdvance: true,
      });
    },

    doArchiveSkills: async (skillIds) => {
      await mutate(() => archiveSkills(skillIds), 'Fehler beim Archivieren.', {
        refetchPinned: false,
      });
    },

    doUnassignSkills: async (skillIds) => {
      await mutate(() => unassignSkills(skillIds), 'Fehler beim Lösen der Zuordnung.', {
        refetchPinned: false,
      });
    },

    doBulkAction: async (action, skillIds, masterId) => {
      set({ loading: true, error: null });
      try {
        await bulkAction(action, skillIds, masterId);
        await Promise.all([get().fetchMasters(), get().fetchSlaves(), get().fetchPinnedMasterSlaves()]);
        if (action === 'assign') {
          if (masterId !== undefined) {
            const master = get().masters?.items.find(i => i.id === masterId);
            if (master) get().pinItem(master);
          }
          // Assigned cards are no longer valid in SP1 — clear only SP1
          // selection and similarity data. SP2 selection stays intact.
          // Refresh SP2 selected items from the just-fetched masters data
          // so alias_count and other fields reflect the current DB state.
          const { sp2SelectedIds, masters: freshMasters } = get();
          const freshSp2Items = freshMasters?.items.filter(i => sp2SelectedIds.has(i.id)) ?? [];
          set({
            sp1SelectedIds: new Set(),
            sp1SelectedItems: [],
            sp1Anchor: null,
            sp2SelectedItems: freshSp2Items,
            similarMasters: null,
            similarSlaves: null,
            similarLoading: false,
          });
          get().refreshSimilarMasters();
        } else {
          get().clearSelection();
        }
        set({ loading: false });
        if (action === 'assign' || action === 'activate') {
          void get().tryAutoAdvance();
        }
      } catch {
        set({ error: 'Fehler bei der Bulk-Aktion.', loading: false });
      }
    },

    doRenameSkill: async (skillId, name) => {
      const state = get();
      const item = state.masters?.items.find(i => i.id === skillId)
        ?? state.slaves?.items.find(i => i.id === skillId)
        ?? state.pinnedMasterSlaves?.items.find(i => i.id === skillId)
        ?? state.sp2SelectedItems.find(i => i.id === skillId)
        ?? state.sp1SelectedItems.find(i => i.id === skillId)
        ?? state.sp3SelectedItems.find(i => i.id === skillId)
        ?? state.similarMasters?.find(i => i.id === skillId)
        ?? state.similarSlaves?.find(i => i.id === skillId)
        ?? state.pinnedItem;
      if (!item || item.name === name) return;

      set((s) => ({
        masters: s.masters
          ? { ...s.masters, items: s.masters.items.map(i => (i.id === skillId ? { ...i, name } : i)) }
          : null,
        slaves: s.slaves
          ? { ...s.slaves, items: s.slaves.items.map(i => (i.id === skillId ? { ...i, name } : i)) }
          : null,
        pinnedMasterSlaves: s.pinnedMasterSlaves
          ? {
            ...s.pinnedMasterSlaves,
            items: s.pinnedMasterSlaves.items.map(i => (i.id === skillId ? { ...i, name } : i)),
          }
          : null,
        pinnedItem: s.pinnedItem?.id === skillId ? { ...s.pinnedItem, name } : s.pinnedItem,
        sp1SelectedItems: s.sp1SelectedItems.map(i => (i.id === skillId ? { ...i, name } : i)),
        sp2SelectedItems: s.sp2SelectedItems.map(i => (i.id === skillId ? { ...i, name } : i)),
        sp3SelectedItems: s.sp3SelectedItems.map(i => (i.id === skillId ? { ...i, name } : i)),
        similarMasters: s.similarMasters?.map(i => (i.id === skillId ? { ...i, name } : i)) ?? null,
        similarSlaves: s.similarSlaves?.map(i => (i.id === skillId ? { ...i, name } : i)) ?? null,
      }));

      try {
        await updateSkillName(item, name);
      } catch {
        set({ error: 'Fehler beim Umbenennen.' });
        await Promise.all([get().fetchMasters(), get().fetchSlaves(), get().fetchPinnedMasterSlaves()]);
        get().refreshSimilarMasters();
      }
    },

    doGroupStatus: async (masterId, status) => {
      await mutate(async () => {
        const slavePage = await fetchBoard({
          column: 'slaves',
          master_id: masterId,
          size: 100,
          sort_by: 'name',
          sort_order: 'asc',
          page: 0,
        });
        const slaveIds = slavePage.items.map(i => i.id);
        await bulkAction(status, [masterId, ...slaveIds]);
      }, 'Fehler beim Gruppen-Status-Wechsel.');
    },

    doDissolveGroup: async (masterId) => {
      await mutate(() => dissolveGroup(masterId), 'Fehler beim Auflösen der Gruppe.', {
        logError: 'dissolveGroup failed:',
      });
    },

    doBulkDissolveGroups: async (masterIds) => {
      await mutate(
        () => Promise.all(masterIds.map((id) => dissolveGroup(id))),
        'Fehler beim Auflösen der Gruppen.',
        { logError: 'bulk dissolveGroup failed:' },
      );
    },
  };
};
