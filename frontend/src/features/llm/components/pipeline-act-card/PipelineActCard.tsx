import Icon from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import type { PipelineActResult } from '@src/lib/api/aiscopeEndcustomer';
import { routeConfig } from '@src/router.config';

import ActData from './ActData';
import { CONTAINER, ERROR_TEXT, FOOTER_STRIP, HEADER_STRIP, ROW } from './constants';

// ── Props ────────────────────────────────────────────────────────────────────

export interface PipelineActCardProps {
  act: PipelineActResult;
}

function fmtMs(ms: number | null): string {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 *
 */
export default function PipelineActCard({ act }: PipelineActCardProps) {
  const isDone = act.status === 'done';
  const isFailed = act.status === 'failed';

  const iconName = isDone ? 'check-circle' : isFailed ? 'x-circle' : 'info';
  const iconVariant = isDone ? ('green' as const) : isFailed ? ('red' as const) : ('muted' as const);

  return (
    <div className={CONTAINER}>
      {/* Header */}
      <div className={HEADER_STRIP}>
        <Icon name={iconName} size="xs" variant={iconVariant} />
        <Text size="xs" weight="medium" color="muted" uppercase>
          Act {act.act}: {act.name}
        </Text>
        {act.duration_ms != null && (
          <Text size="xs" color="muted">
            ({fmtMs(act.duration_ms)})
          </Text>
        )}
        {isFailed && act.error && (
          <div className={ERROR_TEXT}>
            <Text size="xs" color="error">
              {act.error}
            </Text>
          </div>
        )}
      </div>

      {/* Summary */}
      {act.summary && (
        <div className={ROW}>
          <Text size="xs" color="muted">
            {act.summary}
          </Text>
        </div>
      )}

      {/* Act-specific data */}
      {isDone && <ActData act={act} />}

      {/* Footer: call log link */}
      {act.call_log_id != null && (
        <div className={FOOTER_STRIP}>
          <Link
            to={`${routeConfig.adminLlmCallLogs.path}?call_log_id=${act.call_log_id}`}
            variant="muted"
            size="sm"
          >
            Call Log #{act.call_log_id} →
          </Link>
        </div>
      )}
    </div>
  );
}
