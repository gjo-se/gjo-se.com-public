/**
 * useSkillCuration – Server-side table state for the FBF skill curation view.
 *
 * Uses useServerSideTable (same pattern as useAdminProjects, useLLMCallLogs).
 * Loads one page at a time from the backend, passes all filter params
 * (q, status, tag, master, min scores) as query params.
 *
 * Tags are loaded via coreService (core_taggable API) for the tag chips + tag filter.
 */

import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';


import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import Dropdown, { type DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import Text from '@src/components/primitives/Text/Text';
import type { TableBulkActionProps, TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { fetchCoreTags, type CoreTagOut } from '@src/lib/api/coreCatalog';
import { showErrorToast } from '@src/lib/errorToast';

import { confirmRows } from '../../utils/curation';
import DescriptionCell from '../components/data-table/DescriptionCell';
import GroupCell from '../components/data-table/GroupCell';
import InlineScoreCell, { type ScoreField } from '../components/data-table/InlineScoreCell';
import ScoreFilter from '../components/data-table/ScoreFilter';
import SkillNameCell from '../components/data-table/SkillNameCell';
import TagAssignCell from '../components/tag-assign/TagAssignCell';
import {
  confirmSkills,
  createSkill,
  fetchAdminSkills,
  fetchAdminSkillsCount,
  updateSkillDescription,
  updateSkillName,
  updateSkillScore,
  updateSkillGroup,
  type SkillAdminOut,
  type SkillScoreField,
} from '../services/curation';
import { deleteSkillById } from '../services/deleteSkill';
import { type SkillCurationRow, buildSkillRows } from '../utils/skillCuration';
import {
  GROUP_PARAM,
  MASTER_PARAM,
  MIN_AVG_PARAM,
  MIN_IMP_PARAM,
  MIN_L1_PARAM,
  MIN_L2_PARAM,
  SKILL_REGISTRY,
  STATUS_PARAM,
  TABLE_KEY,
  TAG_PARAM,
  skillFilterParams,
} from '../utils/skillCurationParams';

import { useSkillGroups } from './useSkillGroups';
import { SKILLS_CHANGED_EVENT } from './useSkillPendingCount';

export interface UseSkillCurationResult {
  table: TableStateProps<SkillCurationRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<SkillCurationRow>[]
  bulkActions: TableBulkActionProps<SkillCurationRow>[]
  loading: boolean
  error: string | null
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>
}

import type { ComponentProps } from 'react';

export type { SkillCurationRow } from '../utils/skillCuration';

const MASTER_OPTIONS: DropdownItem[] = [
  { value: 'all', label: 'Alle' },
  { value: 'masters', label: 'Master mit Slaves' },
  { value: 'slaves', label: 'Slaves' },
];

/** Helper: a labeled Dropdown */
function labeledFilter(label: string, props: Record<string, unknown>) {
  return createElement('div', { className: 'flex items-center gap-1 shrink-0' },
    createElement(Text, { as: 'span', size: 'xs', color: 'muted' }, label),
    createElement(Dropdown, props as unknown as ComponentProps<typeof Dropdown>),
  );
}

/** Orchestrates the skill curation table: server-side search/filter/sort, row-actions, bulk-confirm. */
export function useSkillCuration(): UseSkillCurationResult {
  // ── Refs ────────────────────────────────────────────────────────────────
  const statusRef = useRef('active');
  const tagRef = useRef('');
  const masterRef = useRef('masters');
  const minImpRef = useRef('');
  const minL1Ref = useRef('');
  const minL2Ref = useRef('');
  const minAvgRef = useRef('');
  const groupRef = useRef('');

  type LoadFn = (
    search: string, status: string, tag: string, masterFilter: string,
    minImp: string, minL1: string, minL2: string, minAvg: string, group: string,
    pageIndex: number, pageSize: number, sortField: string, sortDir: string,
  ) => Promise<void>;
  const loadRef = useRef<LoadFn>(async () => {});

  // ── Server-side table state ─────────────────────────────────────────────
  const {
    data: skills, total, loading, error: serverError,
    q, page, size, sort, order, tableKey, params,
    setQ, setPage, setSize, setSort, setParam,
    handleSearchChange, resetUrlState, executeLoad,
  } = useServerSideTable<SkillAdminOut>({
    tableKey: TABLE_KEY,
    defaultSort: 'name',
    defaultOrder: 'asc',
    extraParams: SKILL_REGISTRY,
    onLoad: () => {
      const statusRaw = params[STATUS_PARAM] as string | undefined;
      const status = statusRaw !== undefined ? (statusRaw === 'all' ? '' : statusRaw) : 'active';
      const tagRaw = params[TAG_PARAM] as string | undefined;
      const tag = tagRaw !== undefined ? (tagRaw === 'all' ? '' : tagRaw) : '';
      const masterRaw = params[MASTER_PARAM] as string | undefined;
      const masterFilter = masterRaw !== undefined ? (masterRaw === 'all' ? '' : masterRaw) : 'masters';
      const minImp = (params[MIN_IMP_PARAM] as string | undefined) === 'all' ? '' : ((params[MIN_IMP_PARAM] as string) || '');
      const minL1 = (params[MIN_L1_PARAM] as string | undefined) === 'all' ? '' : ((params[MIN_L1_PARAM] as string) || '');
      const minL2 = (params[MIN_L2_PARAM] as string | undefined) === 'all' ? '' : ((params[MIN_L2_PARAM] as string) || '');
      const minAvg = (params[MIN_AVG_PARAM] as string | undefined) === 'all' ? '' : ((params[MIN_AVG_PARAM] as string) || '');
      const groupRaw = params[GROUP_PARAM] as string | undefined;
      const group = groupRaw !== undefined ? (groupRaw === 'all' ? '' : groupRaw) : '';
      statusRef.current = status;
      tagRef.current = tag;
      masterRef.current = masterFilter;
      minImpRef.current = minImp;
      minL1Ref.current = minL1;
      minL2Ref.current = minL2;
      minAvgRef.current = minAvg;
      groupRef.current = group;
      void loadRef.current(q, status, tag, masterFilter, minImp, minL1, minL2, minAvg, group, page, size, sort, order);
    },
  });

  const statusFilter = (params[STATUS_PARAM] as string) || 'active';
  const tagFilter = (params[TAG_PARAM] as string) || '';
  const masterFilter = (params[MASTER_PARAM] as string) || 'masters';
  const minImpFilter = (params[MIN_IMP_PARAM] as string) || '';
  const minL1Filter = (params[MIN_L1_PARAM] as string) || '';
  const minL2Filter = (params[MIN_L2_PARAM] as string) || '';
  const minAvgFilter = (params[MIN_AVG_PARAM] as string) || '';
  const groupFilter = (params[GROUP_PARAM] as string) || '';

  const minImpNum: number | null = minImpFilter && !isNaN(+minImpFilter) ? +minImpFilter : null;
  const minL1Num: number | null = minL1Filter && !isNaN(+minL1Filter) ? +minL1Filter : null;
  const minL2Num: number | null = minL2Filter && !isNaN(+minL2Filter) ? +minL2Filter : null;
  const minAvgNum: number | null = minAvgFilter && !isNaN(+minAvgFilter) ? +minAvgFilter : null;

  // ── Load function ───────────────────────────────────────────────────────
  const load = useCallback(async (
    search: string, status: string, tag: string, masterFilter: string,
    minImp: string, minL1: string, minL2: string, minAvg: string, group: string,
    pageIndex: number, pageSize: number, sortField: string, sortDir: string,
  ) => {
    await executeLoad(async () => {
      const filters = skillFilterParams(search, status, tag, masterFilter, minImp, minL1, minL2, minAvg, group);
      const [skillData, cnt] = await Promise.all([
        fetchAdminSkills({
          ...filters,
          offset: pageIndex * pageSize,
          limit: pageSize,
          sort_by: sortField || undefined,
          sort_order: (sortDir as 'asc' | 'desc') || undefined,
        }),
        fetchAdminSkillsCount(filters),
      ]);
      window.dispatchEvent(new Event(SKILLS_CHANGED_EVENT));
      return { data: skillData, total: cnt };
    });
  }, [executeLoad]);

  useLayoutEffect(() => { loadRef.current = load; });

  // ── Tags (core_taggable via coreService) ────────────────────────────────
  const [allTags, setAllTags] = useState<CoreTagOut[]>([]);
  useEffect(() => { fetchCoreTags().then(setAllTags).catch(() => {}); }, []);

  const tagOptions: DropdownItem[] = useMemo(
    () => [
      { value: 'all', label: 'Alle' },
      ...allTags.map((t) => ({ value: t.name, label: t.name })),
    ],
    [allTags],
  );

  const { groups: skillGroups } = useSkillGroups();

  const groupOptions: DropdownItem[] = useMemo(
    () => [
      { value: 'all', label: 'Alle' },
      ...skillGroups.map((g) => ({ value: String(g.id), label: g.label })),
    ],
    [skillGroups],
  );

  // ── Current filter values helper ────────────────────────────────────────
  const currentFilters = useCallback(() => ({
    status: statusRef.current,
    tag: tagRef.current,
    master: masterRef.current,
    minImp: minImpRef.current,
    minL1: minL1Ref.current,
    minL2: minL2Ref.current,
    minAvg: minAvgRef.current,
    group: groupRef.current,
  }), []);

  const reload = useCallback(() => {
    const f = currentFilters();
    void loadRef.current(
      q, f.status, f.tag, f.master, f.minImp, f.minL1, f.minL2, f.minAvg, f.group,
      page, size, sort, order,
    );
  }, [q, page, size, sort, order, currentFilters]);

  // ── Filter handlers ─────────────────────────────────────────────────────
  const handleStatusFilterChange = useCallback((value: string) => {
    statusRef.current = value;
    setParam(STATUS_PARAM, value);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleTagFilterChange = useCallback((value: string) => {
    tagRef.current = value;
    setParam(TAG_PARAM, value);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleMasterFilterChange = useCallback((value: string) => {
    masterRef.current = value;
    setParam(MASTER_PARAM, value);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleMinImpChange = useCallback((value: number | null) => {
    const str = value !== null ? String(value) : '';
    minImpRef.current = str;
    setParam(MIN_IMP_PARAM, str);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleMinL1Change = useCallback((value: number | null) => {
    const str = value !== null ? String(value) : '';
    minL1Ref.current = str;
    setParam(MIN_L1_PARAM, str);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleMinL2Change = useCallback((value: number | null) => {
    const str = value !== null ? String(value) : '';
    minL2Ref.current = str;
    setParam(MIN_L2_PARAM, str);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleMinAvgChange = useCallback((value: number | null) => {
    const str = value !== null ? String(value) : '';
    minAvgRef.current = str;
    setParam(MIN_AVG_PARAM, str);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  const handleGroupFilterChange = useCallback((value: string) => {
    groupRef.current = value === 'all' ? '' : value;
    setParam(GROUP_PARAM, value);
    setPage(0);
    reload();
  }, [setParam, setPage, reload]);

  // ── Row handlers ────────────────────────────────────────────────────────
  const handleCommitScore = useCallback(async (
    skillId: number, field: SkillScoreField, value: number | null,
  ) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill || skill[field] === value) return;
    try {
      await updateSkillScore(skill, field, value);
      reload();
    } catch {
      showErrorToast('Fehler beim Speichern des Wertes.');
      reload();
    }
  }, [skills, reload]);

  const handleCommitGroup = useCallback(async (skillId: number, groupId: number | null) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill || skill.group_id === groupId) return;
    try {
      await updateSkillGroup(skill, groupId);
      reload();
    } catch {
      showErrorToast('Fehler beim Speichern der Gruppe.');
      reload();
    }
  }, [skills, reload]);

  const handleRename = useCallback(async (skillId: number, name: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill || skill.name === name) return;
    try {
      await updateSkillName(skill, name);
      reload();
    } catch {
      showErrorToast('Fehler beim Umbenennen des Skills.');
      reload();
    }
  }, [skills, reload]);

  const handleDescriptionChange = useCallback(async (skillId: number, description: string | null) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;
    try {
      await updateSkillDescription(skill, description);
      reload();
    } catch {
      showErrorToast('Fehler beim Speichern der Beschreibung.');
      reload();
    }
  }, [skills, reload]);

  const onGhostCreate = useCallback(async (data: Record<string, unknown>): Promise<unknown> => {
    const name = String(data.name ?? '').trim();
    if (!name) throw new Error('Name ist erforderlich.');
    await createSkill({ name });
    reload();
    return { name };
  }, [reload]);

  // ── Column definitions ──────────────────────────────────────────────────
  const columns: Record<string, TableColumnProps> = {
    id: { label: 'ID', width: '80px', sortField: 'id' },
    name: {
      label: 'Name',
      width: '260px',
      search: true,
      defaultSort: 'asc',
      ghostInput: 'text',
      ghostPlaceholder: 'Skill-Name…',
      renderCell: (row) => createElement(SkillNameCell, {
        name: row.name as string,
        onRename: (name: string) => handleRename(row.id as number, name),
      }),
      filter: () => createElement('div', { className: 'flex items-center gap-2' },
        createElement(StatusFilter, {
          statusableType: 'fbf_skill',
          selectedValue: statusFilter,
          onSelect: handleStatusFilterChange,
        }),
        labeledFilter('Master:', {
          items: MASTER_OPTIONS,
          selectedValue: masterFilter,
          onSelect: handleMasterFilterChange,
        }),
      ),
    },
    description: {
      label: 'Beschreibung',
      width: '220px',
      renderCell: (row) => createElement(DescriptionCell, {
        value: row.description as string | null,
        onCommit: (desc: string | null) => void handleDescriptionChange(row.id as number, desc),
      }),
    },
    project_count: {
      label: 'Projekte',
      width: '90px',
      sortField: 'project_count',
      renderCell: (row) => {
        const pct = row.project_percentage as number | null | undefined;
        if (pct == null) return '–';
        return `${pct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
      },
    },
    avg_project_importance: {
      label: '∅ Importance',
      width: '90px',
      sortField: 'avg_project_importance_sort',
      filter: () => createElement(ScoreFilter, {
        value: minAvgNum,
        onChange: handleMinAvgChange,
        placeholder: '∅ Imp ≥',
      }),
    },
    importance: {
      label: 'Importance',
      width: '90px',
      sortField: 'importance_sort',
      filter: () => createElement(ScoreFilter, {
        value: minImpNum,
        onChange: handleMinImpChange,
        placeholder: 'Imp ≥',
      }),
      renderCell: (row) => {
        const skill = skills.find((s) => s.id === row.id);
        if (!skill) return null;
        return createElement(InlineScoreCell, {
          value: skill.importance ?? null,
          field: 'importance' as ScoreField,
          onCommit: (value: number | null) => void handleCommitScore(row.id as number, 'importance', value),
        });
      },
    },
    level: {
      label: 'Level I',
      width: '90px',
      sortField: 'level_sort',
      filter: () => createElement(ScoreFilter, {
        value: minL1Num,
        onChange: handleMinL1Change,
        placeholder: 'Lv I ≥',
      }),
      renderCell: (row) => {
        const skill = skills.find((s) => s.id === row.id);
        if (!skill) return null;
        return createElement(InlineScoreCell, {
          value: skill.level ?? null,
          field: 'level' as ScoreField,
          onCommit: (value: number | null) => void handleCommitScore(row.id as number, 'level', value),
        });
      },
    },
    level_public: {
      label: 'Level II',
      width: '90px',
      sortField: 'level_public_sort',
      filter: () => createElement(ScoreFilter, {
        value: minL2Num,
        onChange: handleMinL2Change,
        placeholder: 'Lv II ≥',
      }),
      renderCell: (row) => {
        const skill = skills.find((s) => s.id === row.id);
        if (!skill) return null;
        return createElement(InlineScoreCell, {
          value: skill.level_public ?? null,
          field: 'level_public' as ScoreField,
          onCommit: (value: number | null) => void handleCommitScore(row.id as number, 'level_public', value),
        });
      },
    },
    group: {
      label: 'Gruppe',
      width: '130px',
      sortable: false,
      renderCell: (row) => {
        const skill = skills.find((s) => s.id === row.id);
        if (!skill) return null;
        return createElement(GroupCell, {
          value: skill.group_id ?? null,
          onCommit: (value: number | null) => void handleCommitGroup(row.id as number, value),
        });
      },
      filter: () => labeledFilter('Gruppe:', {
        items: groupOptions,
        selectedValue: groupFilter || 'all',
        onSelect: handleGroupFilterChange,
      }),
    },
    tags: {
      label: 'Tags',
      width: '220px',
      sortable: false,
      renderCell: (row) => {
        const skill = skills.find((s) => s.id === row.id);
        if (!skill) return null;
        return createElement(TagAssignCell, {
          skillId: skill.id,
          onTagsChanged: reload,
        });
      },
      filter: () => labeledFilter('Tag:', {
        items: tagOptions,
        selectedValue: tagFilter,
        onSelect: handleTagFilterChange,
      }),
    },
    status: {
      label: 'Status',
      width: '60px',
      sortable: false,
      renderCell: (row) => {
        const skill = skills.find((s) => s.id === row.id);
        if (!skill) return null;
        return createElement(StatusCell, {
          statusableType: 'fbf_skill',
          statusableId: skill.id,
          currentStatus: skill.status,
          currentColor: skill.status_color_token,
        });
      },
    },
  };

  // ── Row building ────────────────────────────────────────────────────────
  const data = useMemo(() => buildSkillRows(skills, allTags), [skills, allTags]);

  // ── Row actions ─────────────────────────────────────────────────────────
  const rowActions = useTableActions<SkillCurationRow>({
    onDelete: async (row) => {
      try { await deleteSkillById(row.id); reload(); }
      catch { showErrorToast('Skill wird von Projekten verwendet und kann nicht gelöscht werden.'); }
    },
    deleteDisabled: (row) => (row.project_percentage ?? 0) > 0,
    deleteDisabledTitle: 'Wird von Projekten verwendet – nicht löschbar',
  });

  // ── Bulk actions ────────────────────────────────────────────────────────
  const bulkActions: TableBulkActionProps<SkillCurationRow>[] = [
    {
      key: 'confirm',
      label: 'Bestätigen',
      onAction: async (rows) => {
        if (await confirmRows(rows, confirmSkills, 'Fehler beim Bestätigen der Skills.')) {
          reload();
        }
      },
    },
  ];

  return {
    table: buildTableState({
      data, total, q, page, size, sort, order, tableKey,
      setQ, setPage, setSize, setSort, handleSearchChange, resetUrlState,
    }),
    columns, rowActions, bulkActions, loading,
    error: serverError,
    onGhostCreate,
  };
}
