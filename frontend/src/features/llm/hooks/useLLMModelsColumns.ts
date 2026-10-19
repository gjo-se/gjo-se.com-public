/**
 * useLLMModelsColumns – Column definitions (with inline header filters) for the
 * LLM models table. Uses React.createElement – no JSX.
 */

import { createElement, type FocusEvent, type KeyboardEvent } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import Dropdown from '@src/components/molecules/Dropdown/Dropdown';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import Input from '@src/components/primitives/Input/Input';
import Text from '@src/components/primitives/Text/Text';
import type { TableColumnProps } from '@src/components/table';
import type { TableExtraParams } from '@src/components/table/useTableUrlState';

/** Shared dropdown items for the modality filters. */
const MODALITY_ITEMS: DropdownItem[] = [
  { value: '', label: 'Alle' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'file', label: 'File' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

/** Shared dropdown items for the boolean filters. */
const BOOL_ITEMS: DropdownItem[] = [
  { value: '', label: 'Alle' },
  { value: 'true', label: 'Ja' },
  { value: 'false', label: 'Nein' },
];

/** Inputs required to build the LLM models table columns. */
export interface UseLLMModelsColumnsParams {
  params: TableExtraParams
  onInputModalityChange: (value: string | null) => void
  onOutputModalityChange: (value: string | null) => void
  onSupportsStructuredOutputChange: (value: string) => void
  onReasoningChange: (value: string) => void
  onIsActiveChange: (value: string) => void
  onPriceMinChange: (value: number | null) => void
  onPriceMaxChange: (value: number | null) => void
}

/** Wraps a Dropdown in a labelled inline-flex container so the context stays visible. */
function LabelledDropdown(label: string, dropdownElement: ReturnType<typeof createElement>) {
  return createElement(
    'div',
    { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } },
    createElement(Text, { as: 'span', size: 'xs', color: 'secondary' }, `${label}:`),
    dropdownElement,
  );
}

/** Builds the column map (labels, widths, inline filters) for the LLM models table. */
export function useLLMModelsColumns({
  params,
  onInputModalityChange,
  onOutputModalityChange,
  onSupportsStructuredOutputChange,
  onReasoningChange,
  onIsActiveChange,
  onPriceMinChange,
  onPriceMaxChange,
}: UseLLMModelsColumnsParams): Record<string, TableColumnProps> {
  return {
    id: { label: 'ID', width: '54px' },
    displayName: { label: 'Name', width: '180px', search: true, defaultSort: 'asc' },
    // Input modalities – filter dropdown on inText
    inText: {
      label: 'T', width: '40px', sortable: false,
      filter: () =>
        LabelledDropdown('Input', createElement(Dropdown, {
          items: MODALITY_ITEMS,
          selectedValue: (params.input_modality as string) ?? '',
          onSelect: (value: string) => onInputModalityChange(value || null),
          placeholder: '…',
        })),
    },
    inImage: { label: 'I', width: '40px', sortable: false },
    inFile: { label: 'F', width: '40px', sortable: false },
    inAudio: { label: 'A', width: '40px', sortable: false },
    inVideo: { label: 'V', width: '40px', sortable: false },
    // Separator IN → OUT
    sepInOut: { label: '', width: '12px', sortable: false, compact: true },
    // Output modalities – filter dropdown on outText
    outText: {
      label: 'T', width: '40px', sortable: false,
      filter: () =>
        LabelledDropdown('Output', createElement(Dropdown, {
          items: MODALITY_ITEMS,
          selectedValue: (params.output_modality as string) ?? '',
          onSelect: (value: string) => onOutputModalityChange(value || null),
          placeholder: '…',
        })),
    },
    outImage: { label: 'I', width: '40px', sortable: false },
    outFile: { label: 'F', width: '40px', sortable: false },
    outAudio: { label: 'A', width: '40px', sortable: false },
    outVideo: { label: 'V', width: '40px', sortable: false },
    // Separator OUT → SO
    sepOutSo: { label: '', width: '12px', sortable: false, compact: true },
    supportsStructuredOutput: {
      label: 'SO', width: '42px', sortable: false,
      filter: () =>
        LabelledDropdown('Struct. Out', createElement(Dropdown, {
          items: BOOL_ITEMS,
          selectedValue: params.supports_structured_output != null ? String(params.supports_structured_output) : '',
          onSelect: onSupportsStructuredOutputChange,
          placeholder: '…',
          disabled: !!(params.output_modality && params.output_modality !== 'text'),
        })),
    },
    reasoning: {
      label: 'R', width: '34px', sortable: false,
      filter: () =>
        LabelledDropdown('Reasoning', createElement(Dropdown, {
          items: BOOL_ITEMS,
          selectedValue: params.reasoning != null ? String(params.reasoning) : '',
          onSelect: onReasoningChange,
          placeholder: '…',
        })),
    },
    priceRange: {
      label: '', width: '1px', sortable: false, compact: true,
      filter: () =>
        createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } },
          createElement(Text, { as: 'span', size: 'xs', color: 'secondary' }, 'Price:'),
          createElement(Input, {
            type: 'number', min: 0, step: 0.01, defaultValue: params.price_min != null ? String(params.price_min) : '', placeholder: 'Min',
            key: `pmin-${params.price_min ?? ''}`,
            onBlur: (e: FocusEvent<HTMLInputElement>) => {
              const v = (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null;
              onPriceMinChange(v);
            },
            onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null;
                onPriceMinChange(v);
                (e.target as HTMLInputElement).blur();
              }
            },
          }),
          createElement(Text, { as: 'span', size: 'xs', color: 'muted' }, '–'),
          createElement(Input, {
            type: 'number', min: 0, step: 0.01, defaultValue: params.price_max != null ? String(params.price_max) : '', placeholder: 'Max',
            key: `pmax-${params.price_max ?? ''}`,
            onBlur: (e: FocusEvent<HTMLInputElement>) => {
              const v = (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null;
              onPriceMaxChange(v);
            },
            onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null;
                onPriceMaxChange(v);
                (e.target as HTMLInputElement).blur();
              }
            },
          }),
        ),
    },
    priceInput: {
      label: '$/1M In', width: '72px',
      filter: () =>
        createElement(StatusFilter, {
          statusableType: 'llm_model',
          selectedValue: (params.is_active != null ? (params.is_active ? 'active' : 'inactive') : ''),
          onSelect: (value) => {
            onIsActiveChange(value === '' ? '' : value === 'active' ? 'true' : 'false');
          },
        }),
    },
    status: {
      label: 'Status',
      width: '60px',
      sortable: false,
      renderCell: (row) => createElement(StatusCell, {
        statusableType: 'llm_model',
        statusableId: row['id'] as number,
        currentStatus: row['status'] as string | null | undefined,
        currentColor: row['status_color_token'] as string | null | undefined,
      }),
    },
  };
}
