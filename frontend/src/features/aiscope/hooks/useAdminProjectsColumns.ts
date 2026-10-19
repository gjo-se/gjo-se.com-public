/**
 * Column definitions (with inline header filters) for the AdminProjects table.
 * Uses React.createElement – no JSX in this .ts hook.
 */
import { createElement } from 'react';

import DateRangeFilter from '@src/components/molecules/DateRangeFilter/DateRangeFilter';
import Dropdown from '@src/components/molecules/Dropdown/Dropdown';
import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text/Text';
import type { TableColumnProps } from '@src/components/table';

import { PROJECT_PRESETS, type ProjectPreset } from '../core/types';
import ScoreFilter from '../shared/ScoreFilter';
import { PROJECTS_TABLE_KEY } from '../utils/adminProjectsTable';

/** Inputs required to build the AdminProjects table columns. */
export interface UseAdminProjectsColumnsParams {
  llmFilter: string
  jobRoleItems: { value: string; label: string }[]
  jobRoleFilter: number | null
  endcustomerFilter: boolean | null
  minScoreFilter: number | null
  myProjects: boolean
  preset: ProjectPreset
  onLlmChange: (value: string) => void
  onJobRoleChange: (value: string) => void
  onEndcustomerChange: (value: string) => void
  onMinScoreChange: (value: number | null) => void
  onToggleMyProjects: () => void
  onPresetChange: (value: ProjectPreset) => void
}

/** Builds the column map (labels, widths, inline filters) for the projects table. */
export function useAdminProjectsColumns(params: UseAdminProjectsColumnsParams): Record<string, TableColumnProps> {
  const {
    llmFilter,
    jobRoleItems,
    jobRoleFilter,
    endcustomerFilter,
    minScoreFilter,
    myProjects,
    preset,
    onLlmChange,
    onJobRoleChange,
    onEndcustomerChange,
    onMinScoreChange,
    onToggleMyProjects,
    onPresetChange,
  } = params;

  return {
    id: { label: 'ID', width: '70px', search: true },
    title: { label: 'Titel', width: '250px', search: true },
    city: { label: 'Stadt', width: '110px' },
    remotePercent: {
      label: 'Remote %',
      width: '90px',
      filter: () => createElement(Dropdown, {
        items: [
          { value: '', label: 'LLM: Alle' },
          { value: 'not_merged', label: 'Nicht gemerged' },
          { value: 'no_skills', label: 'Keine Skills' },
        ],
        selectedValue: llmFilter,
        onSelect: onLlmChange,
        placeholder: 'LLM',
      }),
    },
    jobRole: {
      label: 'JobRole',
      width: '140px',
      sortField: 'job_role_name',
      filter: () => createElement(Dropdown, {
        items: jobRoleItems,
        selectedValue: jobRoleFilter?.toString() ?? '',
        onSelect: onJobRoleChange,
        placeholder: 'Alle JobRoles',
      }),
    },
    duration: { label: 'Dauer', width: '80px' },
    postedAt: {
      label: 'Eingestellt',
      width: '110px',
      defaultSort: 'desc',
      filter: () => createElement(DateRangeFilter, { tableKey: PROJECTS_TABLE_KEY }),
    },
    linkedCount: { label: 'Projects', width: '100px' },
    matchScore: {
      label: 'Score',
      width: '110px',
      defaultSort: 'desc',
      filter: () => createElement('div', { className: 'flex items-center gap-2' },
        createElement(ScoreFilter, {
          value: minScoreFilter,
          onChange: onMinScoreChange,
        }),
        createElement(Button, {
          size: 'sm',
          onClick: onToggleMyProjects,
        }, `Meine Projekte ${myProjects ? '✓' : ''}`),
      ),
    },
    confirmedScore: {
      label: 'Score II',
      width: '80px',
      defaultSort: 'desc',
    },
    endcustomer: {
      label: 'EK',
      width: '40px',
      sortField: 'endcustomer',
      filter: () => createElement(Dropdown, {
        items: [
          { value: '', label: 'Alle' },
          { value: 'true', label: 'Endkunde' },
          { value: 'false', label: 'Vermittler' },
        ],
        selectedValue: endcustomerFilter === null ? '' : String(endcustomerFilter),
        onSelect: onEndcustomerChange,
        placeholder: 'Alle',
      }),
    },
    hourlyRate: {
      label: '€/h',
      width: '80px',
      sortField: 'hourly_rate',
      renderCell: (row: Record<string, unknown>) => {
        const value = row.hourlyRate;
        const hasValue = value != null && value !== '';
        return createElement(
          Text,
          { as: 'span', color: hasValue ? undefined : 'muted' },
          hasValue ? String(value) : '–',
        );
      },
    },
    statusCell: {
      label: 'Status',
      width: '60px',
      filter: () => createElement('div', { className: 'flex items-center gap-1 shrink-0' },
        createElement(Text, { as: 'span', size: 'xs', color: 'muted' }, 'Status:'),
        createElement(Dropdown, {
          items: PROJECT_PRESETS,
          selectedValue: preset,
          onSelect: (v: string) => onPresetChange(v as ProjectPreset),
        }),
      ),
    },
  };
}
