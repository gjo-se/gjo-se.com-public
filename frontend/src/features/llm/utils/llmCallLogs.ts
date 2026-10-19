/**
 * useLLMCallLogs.logic – Pure row formatting for the call-log table.
 *
 * Maps API rows to display rows and renders status/error-type as coloured
 * Chips. Uses createElement (no JSX in a .logic.ts file).
 */
import { createElement } from 'react';

import Chip from '@src/components/primitives/Chip';
import type { ChipProps } from '@src/components/primitives/Chip/Chip.interface';
import type { CallLogOut } from '@src/lib/api/callLog';
import { formatDateTimeSeconds } from '@src/lib/formatDate';

import type { ReactNode } from 'react';

export interface CallLogTableRow {
  id: number
  task: string
  trigger: string
  phase: string | null
  projectId: number | null
  model: string
  credential: string
  duration: string
  tokens: string
  tokensTooltip: string | null
  createdAt: string
  statusCell: ReactNode
  errorTypeCell: ReactNode
  errorType: string | null
  success: boolean | null
  _promotedTo: string | null
  _errorType: string | null
  _success: boolean | null
  promotedStatus: string  // empty | 'golden' | 'failure' – for column filter
}

type ChipVariant = NonNullable<ChipProps['variant']>;

const EM_DASH = '\u2013';

const ERROR_TYPE_LABELS: Record<string, string> = {
  no_mapping: 'Kein Mapping',
  model_disabled: 'Modell deaktiviert',
  no_credential: 'Kein Credential',
  credential_invalid: 'Credential ungültig',
  no_prompt: 'Kein Prompt',
  prompt_variable_missing: 'Prompt-Variable fehlt',
  provider_error: 'Provider-Fehler',
  rate_limit: 'Rate-Limit',
  validation_error: 'Validierungsfehler',
  unknown: 'Unbekannt',
};

const ERROR_TYPE_VARIANTS: Record<string, ChipVariant> = {
  no_mapping: 'warning',
  model_disabled: 'warning',
  no_credential: 'warning',
  credential_invalid: 'warning',
  no_prompt: 'warning',
  prompt_variable_missing: 'warning',
  provider_error: 'destructive',
  rate_limit: 'warning',
  validation_error: 'destructive',
  unknown: 'destructive',
};

/** Builds the hover tooltip breakdown for prompt/completion tokens.
 *  Returns null when both sides are missing; otherwise a 'Prompt n · Completion n' string
 *  in German thousands format, omitting the side that is missing. */
function buildTokenTooltip(prompt: number | null, completion: number | null): string | null {
  if (prompt === null && completion === null) return null;
  const parts: string[] = [];
  if (prompt !== null) parts.push(`Prompt ${formatTokenCount(prompt)}`);
  if (completion !== null) parts.push(`Completion ${formatTokenCount(completion)}`);
  return parts.join(' · ');
}

/** Maps API call-log rows to display rows with coloured status/error chips. */
export function formatCallLogRows(
  logs: CallLogOut[],
): CallLogTableRow[] {
  return logs.map((log) => ({
    id: log.id,
    task: log.task,
    trigger: log.trigger ?? EM_DASH,
    phase: log.phase ?? null,
    projectId: log.project_id ?? null,
    model: log.resolved_model ?? EM_DASH,
    credential: log.resolved_credential ?? EM_DASH,
    duration: log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : EM_DASH,
    tokens: formatTokenCount(log.total_tokens),
    tokensTooltip: buildTokenTooltip(log.prompt_tokens, log.completion_tokens),
    createdAt: formatDateTimeSeconds(log.created_at),
    statusCell: renderStatusChip(log.success),
    errorTypeCell: renderErrorTypeChip(log.error_type, log.error_message),
    errorType: log.error_type,
    success: log.success,
    promotedStatus: log.promoted_to || '',
    _promotedTo: log.promoted_to ?? null,
    _errorType: log.error_type,
    _success: log.success,
  }));
}

/** Formats a token count in German thousands format (1234 → '1.234'); null → em dash. */
function formatTokenCount(value: number | null): string {
  if (value === null) return EM_DASH;
  return new Intl.NumberFormat('de-DE').format(value);
}

/** Renders the error-type Chip, or an em dash for successful calls.
 *  Clicking the chip copies the full error message to clipboard. */
function renderErrorTypeChip(errorType: string | null, errorMessage: string | null): ReactNode {
  if (!errorType) return EM_DASH;
  const label = ERROR_TYPE_LABELS[errorType] ?? errorType;
  const variant = ERROR_TYPE_VARIANTS[errorType] ?? 'destructive';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = errorMessage || label;
    void navigator.clipboard.writeText(text);
  };

  return createElement(
    'div',
    { title: errorMessage ? `${label}: ${errorMessage}` : label, style: { cursor: 'pointer' }, onClick: handleClick },
    createElement(Chip, { variant, size: 'sm' }, label),
  );
}

/** Renders the success/error/pending status Chip. */
function renderStatusChip(success: boolean | null): ReactNode {
  if (success === null) {
    return createElement(Chip, { variant: 'muted', size: 'sm' }, 'Läuft…');
  }
  return success
    ? createElement(Chip, { variant: 'success', size: 'sm' }, 'Erfolg')
    : createElement(Chip, { variant: 'error', size: 'sm' }, 'Fehler');
}
