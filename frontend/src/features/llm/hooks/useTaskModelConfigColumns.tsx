/**
 * useTaskModelConfigColumns – Column definitions for the unified LLM model config table.
 *
 * Ghost-row columns (provider/model/reasoning comboboxes) and inline-edit columns
 * (temperature/max_tokens/top_p/advanced JSON) wired to the provided edit handlers.
 */

import { createElement, useMemo } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import type { TableColumnProps } from '@src/components/table';

import { REASONING_OPTIONS } from '../shared/reasoningOptions';

import type { ModelConfigTableRow } from './useTaskModelConfigs';

/** Dependencies required to build the model config table columns. */
export interface TaskModelConfigColumnsParams {
  providerOptions: DropdownItem[]
  modelOptions: DropdownItem[]
  onHyperparameterEdit: (rowId: number, field: string, value: string) => Promise<void>
  onAdvancedJsonEdit: (rowId: number, json: string) => Promise<void>
}

/** Builds the memoized columns for the unified model config table. */
export function useTaskModelConfigColumns({
  providerOptions,
  modelOptions,
  onHyperparameterEdit,
  onAdvancedJsonEdit,
}: TaskModelConfigColumnsParams): Record<string, TableColumnProps> {
  return useMemo(() => ({
    id: {
      label: 'ID',
      width: '60px',
      sortField: 'id',
    },
    providerDisplay: {
      label: 'Provider',
      width: '200px',
      search: true,
      sortField: 'providerSort',
      ghostInput: 'combobox',
      ghostOptions: providerOptions,
    },
    modelDisplay: {
      label: 'Modell',
      width: '220px',
      search: true,
      defaultSort: 'asc',
      sortField: 'modelSort',
      ghostInput: 'combobox',
      ghostOptions: modelOptions,
    },
    temperature: {
      label: 'Temp',
      width: '80px',
      inlineEdit: true,
      onInlineEdit: (row, value) => {
        const r = row as unknown as ModelConfigTableRow;
        if (!r.config) return;
        void onHyperparameterEdit(r.config.id, 'temperature', value);
      },
      ghostInput: 'text',
      ghostPlaceholder: '0.7',
    },
    maxTokens: {
      label: 'Max Tokens',
      width: '100px',
      inlineEdit: true,
      onInlineEdit: (row, value) => {
        const r = row as unknown as ModelConfigTableRow;
        if (!r.config) return;
        void onHyperparameterEdit(r.config.id, 'max_tokens', value);
      },
      ghostInput: 'text',
      ghostPlaceholder: '2000',
    },
    topP: {
      label: 'Top P',
      width: '80px',
      inlineEdit: true,
      onInlineEdit: (row, value) => {
        const r = row as unknown as ModelConfigTableRow;
        if (!r.config) return;
        void onHyperparameterEdit(r.config.id, 'top_p', value);
      },
      ghostInput: 'text',
      ghostPlaceholder: '1.0',
    },
    reasoning: {
      label: 'Reasoning',
      width: '120px',
      sortField: 'reasoningSort',
      ghostInput: 'combobox',
      ghostOptions: REASONING_OPTIONS,
      ghostPlaceholder: 'off',
    },
    advancedJson: {
      label: 'Erweitert',
      width: '200px',
      inlineEdit: true,
      onInlineEdit: (row, value) => {
        const r = row as unknown as ModelConfigTableRow;
        if (!r.config) return;
        void onAdvancedJsonEdit(r.config.id, value.trim());
      },
      ghostInput: 'text',
      ghostPlaceholder: '{"frequency_penalty": 0.5}',
    },
    breakerState: {
      label: 'Circuit',
      width: '90px',
      sortField: 'breakerSort',
    },
    status: {
      label: 'Status',
      width: '80px',
      sortable: false,
      renderCell: (row: Record<string, unknown>) =>
        createElement(StatusCell, {
          statusableType: 'llm_task_model_config',
          statusableId: (row as unknown as ModelConfigTableRow).config.id,
          currentStatus: row.status as string | null | undefined,
          currentColor: row.status_color_token as string | null | undefined,
        }),
    },
  }), [modelOptions, providerOptions, onHyperparameterEdit, onAdvancedJsonEdit]);
}
