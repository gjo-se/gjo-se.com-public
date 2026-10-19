/**
 * Tests: useLLMModelsColumns – column contract and inline filter behavior.
 *
 * Verifies the static column contract (labels/widths/sort flags), that the
 * modality/boolean filters render their labelled control, the disabled
 * structured-output boundary when output modality is not text, and the
 * price-input callbacks (blur + Enter).
 */
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TableColumnProps } from '@src/components/table';
import { useLLMModelsColumns } from '@src/features/llm/hooks/useLLMModelsColumns';

type ColumnFilter = TableColumnProps['filter'];

function renderFilter(filter: ColumnFilter): void {
  const node = typeof filter === 'function' ? filter({}) : filter;
  render(createElement('div', null, node));
}

/** Evaluates a column filter and returns the rendered element for prop inspection. */
function filterElement(filter: ColumnFilter): unknown {
  return typeof filter === 'function' ? (filter as (state: Record<string, unknown>) => unknown)({}) : filter;
}

function buildColumns(overrides: Partial<Parameters<typeof useLLMModelsColumns>[0]> = {}) {
  const callbacks = {
    onInputModalityChange: vi.fn(),
    onOutputModalityChange: vi.fn(),
    onSupportsStructuredOutputChange: vi.fn(),
    onReasoningChange: vi.fn(),
    onIsActiveChange: vi.fn(),
    onPriceMinChange: vi.fn(),
    onPriceMaxChange: vi.fn(),
    ...overrides,
  };

  return {
    callbacks,
    columns: useLLMModelsColumns({ params: {}, ...callbacks }),
  };
}

describe('useLLMModelsColumns', () => {
  it('exposes the expected column contract', () => {
    const { columns } = buildColumns();

    expect(columns.id).toMatchObject({ label: 'ID', width: '54px' });
    expect(columns.displayName).toMatchObject({ label: 'Name', search: true, defaultSort: 'asc' });
    expect(columns.priceInput).toMatchObject({ label: '$/1M In', width: '72px' });
    expect(columns.status.sortable).toBe(false);
    expect(columns.sepInOut.compact).toBe(true);
  });

  it('renders the labelled input-modality filter', () => {
    const { columns } = buildColumns();

    renderFilter(columns.inText.filter);

    expect(screen.getByText('Input:')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('disables the structured-output filter for non-text output modality', () => {
    const { columns } = buildColumns({ params: { output_modality: 'image' } });

    renderFilter(columns.supportsStructuredOutput.filter);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('keeps the structured-output filter enabled for text output modality', () => {
    const { columns } = buildColumns({ params: { output_modality: 'text' } });

    renderFilter(columns.supportsStructuredOutput.filter);

    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('reports the price minimum on blur', () => {
    const { callbacks, columns } = buildColumns();

    renderFilter(columns.priceRange.filter);
    const minInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minInput, { target: { value: '2.5' } });
    fireEvent.blur(minInput);

    expect(callbacks.onPriceMinChange).toHaveBeenCalledWith(2.5);
  });

  it('reports an empty price minimum as null', () => {
    const { callbacks, columns } = buildColumns({ params: { price_min: 3 } });

    renderFilter(columns.priceRange.filter);
    const minInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.blur(minInput);

    expect(callbacks.onPriceMinChange).toHaveBeenCalledWith(null);
  });

  it('reports the price maximum on Enter and blurs the input', () => {
    const { callbacks, columns } = buildColumns();

    renderFilter(columns.priceRange.filter);
    const maxInput = screen.getByPlaceholderText('Max');
    fireEvent.change(maxInput, { target: { value: '10' } });
    fireEvent.keyDown(maxInput, { key: 'Enter' });

    expect(callbacks.onPriceMaxChange).toHaveBeenCalledWith(10);
    expect(maxInput).not.toHaveFocus();
  });

  it('reports the price maximum on blur and as null when cleared', () => {
    const { callbacks, columns } = buildColumns();

    renderFilter(columns.priceRange.filter);
    const maxInput = screen.getByPlaceholderText('Max');
    fireEvent.change(maxInput, { target: { value: '4' } });
    fireEvent.blur(maxInput);
    expect(callbacks.onPriceMaxChange).toHaveBeenCalledWith(4);

    fireEvent.change(maxInput, { target: { value: '' } });
    fireEvent.blur(maxInput);
    expect(callbacks.onPriceMaxChange).toHaveBeenCalledWith(null);
  });

  it('reports the price minimum on Enter and ignores other keys', () => {
    const { callbacks, columns } = buildColumns();

    renderFilter(columns.priceRange.filter);
    const minInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minInput, { target: { value: '1.5' } });
    fireEvent.keyDown(minInput, { key: 'a' });
    expect(callbacks.onPriceMinChange).not.toHaveBeenCalled();

    fireEvent.keyDown(minInput, { key: 'Enter' });
    expect(callbacks.onPriceMinChange).toHaveBeenCalledWith(1.5);
  });

  it('maps the modality filters to null for the empty option', () => {
    const { callbacks, columns } = buildColumns();

    const inputFilter = filterElement(columns.inText.filter) as {
      props: { children: { props: { onSelect: (value: string) => void } }[] }
    };
    inputFilter.props.children[1].props.onSelect('text');
    inputFilter.props.children[1].props.onSelect('');
    expect(callbacks.onInputModalityChange).toHaveBeenNthCalledWith(1, 'text');
    expect(callbacks.onInputModalityChange).toHaveBeenNthCalledWith(2, null);

    const outputFilter = filterElement(columns.outText.filter) as {
      props: { children: { props: { onSelect: (value: string) => void } }[] }
    };
    outputFilter.props.children[1].props.onSelect('image');
    outputFilter.props.children[1].props.onSelect('');
    expect(callbacks.onOutputModalityChange).toHaveBeenNthCalledWith(1, 'image');
    expect(callbacks.onOutputModalityChange).toHaveBeenNthCalledWith(2, null);
  });

  it('maps the boolean filter selections onto the callbacks', () => {
    const { callbacks, columns } = buildColumns();

    const structured = filterElement(columns.supportsStructuredOutput.filter) as unknown as {
      props: { children: { props: { onSelect: (value: string) => void } }[] }
    };
    structured.props.children[1].props.onSelect('true');
    expect(callbacks.onSupportsStructuredOutputChange).toHaveBeenCalledWith('true');

    const reasoning = filterElement(columns.reasoning.filter) as unknown as {
      props: { children: { props: { onSelect: (value: string) => void } }[] }
    };
    reasoning.props.children[1].props.onSelect('false');
    expect(callbacks.onReasoningChange).toHaveBeenCalledWith('false');
  });

  it('maps the active filter to the three value states', () => {
    const { callbacks, columns } = buildColumns({ params: { is_active: true } });

    const filter = filterElement(columns.priceInput.filter) as unknown as {
      props: { onSelect: (value: string) => void; selectedValue: string }
    };
    expect(filter.props.selectedValue).toBe('active');
    filter.props.onSelect('');
    filter.props.onSelect('active');
    filter.props.onSelect('inactive');

    expect(callbacks.onIsActiveChange).toHaveBeenNthCalledWith(1, '');
    expect(callbacks.onIsActiveChange).toHaveBeenNthCalledWith(2, 'true');
    expect(callbacks.onIsActiveChange).toHaveBeenNthCalledWith(3, 'false');
  });

  it('maps an inactive filter parameter to the inactive selection', () => {
    const { columns } = buildColumns({ params: { is_active: false } });

    const filter = filterElement(columns.priceInput.filter) as unknown as {
      props: { selectedValue: string }
    };

    expect(filter.props.selectedValue).toBe('inactive');
  });

  it('builds the status cell for a table row', () => {
    const { columns } = buildColumns();

    const cell = columns.status.renderCell?.({ id: 7, status: 'active', status_color_token: 'green' }) as unknown as {
      props: { statusableId: number, currentStatus: string, currentColor: string }
    };

    expect(cell.props).toMatchObject({
      statusableId: 7,
      currentStatus: 'active',
      currentColor: 'green',
    });
  });

  it('renders the boolean filters with their selected values', () => {
    const { columns } = buildColumns({
      params: { supports_structured_output: true, reasoning: false },
    });

    const structured = filterElement(columns.supportsStructuredOutput.filter) as unknown as {
      props: { children: { props: { selectedValue: string } }[] }
    };
    expect(structured.props.children[1].props.selectedValue).toBe('true');

    const reasoning = filterElement(columns.reasoning.filter) as unknown as {
      props: { children: { props: { selectedValue: string } }[] }
    };
    expect(reasoning.props.children[1].props.selectedValue).toBe('false');
  });

  it('prefills the price inputs and reports empty Enter values as null', () => {
    const { callbacks, columns } = buildColumns({ params: { price_min: 3, price_max: 5 } });

    renderFilter(columns.priceRange.filter);
    expect(screen.getByPlaceholderText('Min')).toHaveValue(3);
    expect(screen.getByPlaceholderText('Max')).toHaveValue(5);

    fireEvent.change(screen.getByPlaceholderText('Max'), { target: { value: '' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Max'), { key: 'Enter' });
    expect(callbacks.onPriceMaxChange).toHaveBeenCalledWith(null);

    fireEvent.change(screen.getByPlaceholderText('Min'), { target: { value: '' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Min'), { key: 'Enter' });
    expect(callbacks.onPriceMinChange).toHaveBeenCalledWith(null);
  });

  it('renders the active filter without a selection when no parameter is set', () => {
    const { columns } = buildColumns();

    const filter = filterElement(columns.priceInput.filter) as unknown as {
      props: { selectedValue: string }
    };

    expect(filter.props.selectedValue).toBe('');
  });
});
