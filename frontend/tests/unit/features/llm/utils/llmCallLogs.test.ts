/**
 * Tests: llmCallLogs – row formatting for the call-log table.
 *
 * Derives cases from the display contract: equals-classes for present vs.
 * missing optional values, boundaries at 0 and the null/undefined edges, and
 * the German number/date formatting. Chips are asserted through their rendered
 * text, not through component props.
 */
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CallLogOut } from '@src/lib/api/callLog';
import { formatCallLogRows } from '@src/features/llm/utils/llmCallLogs';

const EM_DASH = '\u2013';

function makeLog(overrides: Partial<CallLogOut> = {}): CallLogOut {
  return {
    id: 7,
    task: 'merge_description',
    phase: null,
    project_id: null,
    trigger: null,
    call_type: 'llm',
    success: true,
    error_type: null,
    error_message: null,
    resolved_model: 'gpt-4',
    resolved_credential: 'openai-key',
    duration_ms: 1250,
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
    created_at: '2025-01-02T03:04:05Z',
    input_snapshot: null,
    retry_of_id: null,
    retry_count: 0,
    retry_status: null,
    output_snapshot: null,
    promoted_at: null,
    promoted_to: null,
    dataset_item_id: null,
    ...overrides,
  };
}

describe('formatCallLogRows', () => {
  it('maps present values into the display columns', () => {
    const [row] = formatCallLogRows([makeLog({ project_id: 42, trigger: 'manual', phase: 'evaluate' })]);

    expect(row).toMatchObject({
      id: 7,
      task: 'merge_description',
      trigger: 'manual',
      phase: 'evaluate',
      projectId: 42,
      model: 'gpt-4',
      credential: 'openai-key',
      duration: '1.3s',
      tokens: '150',
      tokensTooltip: 'Prompt 100 · Completion 50',
      promotedStatus: '',
    });
  });

  it('renders an em dash for every missing optional value', () => {
    const [row] = formatCallLogRows([
      makeLog({
        trigger: null,
        resolved_model: null,
        resolved_credential: null,
        duration_ms: null,
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        promoted_to: null,
      }),
    ]);

    expect(row).toMatchObject({
      trigger: EM_DASH,
      model: EM_DASH,
      credential: EM_DASH,
      duration: EM_DASH,
      tokens: EM_DASH,
      tokensTooltip: null,
      promotedStatus: '',
    });
  });

  it('keeps zero values instead of treating them as missing', () => {
    const [row] = formatCallLogRows([
      makeLog({ duration_ms: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }),
    ]);

    expect(row.duration).toBe('0.0s');
    expect(row.tokens).toBe('0');
    expect(row.tokensTooltip).toBe('Prompt 0 · Completion 0');
  });

  it('formats large token counts in German thousands notation', () => {
    const [row] = formatCallLogRows([makeLog({ total_tokens: 1234 })]);

    expect(row.tokens).toBe('1.234');
  });

  it('includes only the side that exists in the token tooltip', () => {
    const [row] = formatCallLogRows([makeLog({ prompt_tokens: null, completion_tokens: 75 })]);

    expect(row.tokensTooltip).toBe('Completion 75');
  });

  it('labels the success and pending status chips', () => {
    const [success, pending, failure] = formatCallLogRows([
      makeLog({ success: true }),
      makeLog({ success: null }),
      makeLog({ success: false }),
    ]);

    const { unmount: unmountSuccess } = render(createElement('div', null, success.statusCell));
    expect(screen.getByText('Erfolg')).toBeInTheDocument();
    unmountSuccess();

    const { unmount: unmountPending } = render(createElement('div', null, pending.statusCell));
    expect(screen.getByText('Läuft…')).toBeInTheDocument();
    unmountPending();

    const { unmount: unmountFailure } = render(createElement('div', null, failure.statusCell));
    expect(screen.getByText('Fehler')).toBeInTheDocument();
    unmountFailure();
  });

  it('renders a known error type with its German label', () => {
    const [row] = formatCallLogRows([makeLog({ success: false, error_type: 'rate_limit' })]);

    render(createElement('div', null, row.errorTypeCell));

    expect(screen.getByText('Rate-Limit')).toBeInTheDocument();
  });

  it('falls back to the raw error type for unknown classifications', () => {
    const [row] = formatCallLogRows([makeLog({ success: false, error_type: 'brand_new_type' })]);

    render(createElement('div', null, row.errorTypeCell));

    expect(screen.getByText('brand_new_type')).toBeInTheDocument();
  });

  it('renders an em dash when a successful call has no error type', () => {
    const [row] = formatCallLogRows([makeLog({ success: true, error_type: null })]);

    expect(row.errorTypeCell).toBe(EM_DASH);
  });

  it('maps the promoted status onto the column filter value', () => {
    const [row] = formatCallLogRows([makeLog({ promoted_to: 'golden' })]);

    expect(row.promotedStatus).toBe('golden');
  });
});
