import { cva } from 'class-variance-authority';
import { useEffect } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Link from '@src/components/primitives/Link/Link';
import Text from '@src/components/primitives/Text/Text';

import type { ScanCodeState } from '../../hooks/useScanCode';

const editorLinkVariants = cva('text-xs font-medium');

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ScanCodeToastProps {
  state: ScanCodeState;
  onClose: () => void;
  currentViewKey?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

const STATUS_STYLES: Record<string, { color: string; symbol: string; spin: boolean }> = {
  running: { color: '#3b82f6', symbol: '\u27F3', spin: true },
  done: { color: '#22c55e', symbol: '\u2713', spin: false },
  failed: { color: '#ef4444', symbol: '\u2717', spin: false },
  pending: { color: '#9ca3af', symbol: '\u25CB', spin: false },
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Fixed-position toast that displays scan-code workflow progress
 * with per-activity status indicators, elapsed time, and result.
 */
export default function ScanCodeToast({ state, onClose, currentViewKey }: ScanCodeToastProps) {
  const { status, activities, result, error, elapsed } = state;

  // Auto-dismiss after 5s on successful completion
  useEffect(() => {
    if (status !== 'completed') return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [status, onClose]);

  if (status === 'idle') return null;

  const headerText =
    status === 'running'
      ? 'Scan läuft…'
      : status === 'completed'
        ? 'Scan abgeschlossen'
        : 'Scan fehlgeschlagen';

  const footerText =
    status === 'running'
      ? `Läuft seit ${formatElapsed(elapsed)}`
      : status === 'completed' && elapsed > 0
        ? `Dauer: ${formatElapsed(elapsed)}`
        : `Fehler nach ${formatElapsed(elapsed)}`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 50,
        width: '320px',
        borderRadius: '8px',
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--color-bg, #fff)',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <Text size="sm" weight="semibold">
          {headerText}
        </Text>
        <Button variant="ghost" size="xs" onClick={onClose} title="Schließen">
          ✕
        </Button>
      </div>

      {/* Activity List */}
      <div style={{ marginBottom: '12px' }}>
        {activities.map((activity) => {
          const st = STATUS_STYLES[activity.status] ?? STATUS_STYLES.pending;
          return (
            <div
              key={activity.name}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  width: '16px',
                  height: '16px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: st.color,
                  fontSize: '12px',
                  ...(st.spin ? { animation: 'spin 1s linear infinite' } : {}),
                }}
              >
                {st.symbol}
              </div>
              <Text
                size="xs"
                color={activity.status === 'failed' ? 'error' : 'default'}
              >
                {activity.label}
              </Text>
              {activity.error && (
                <div
                  style={{
                    marginLeft: 'auto',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '120px',
                    fontSize: '12px',
                    color: '#ef4444',
                  }}
                >
                  {activity.error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size="xs" color="muted">
            {footerText}
          </Text>
        </div>
        {status === 'completed' && result && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {result.objects_new > 0 && (
              <div
                style={{
                  background: '#dcfce7', color: '#166534', fontSize: '11px',
                  padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                }}
              >
                {result.objects_new} neu
              </div>
            )}
            {result.objects_updated > 0 && (
              <div
                style={{
                  background: '#dbeafe', color: '#1e40af', fontSize: '11px',
                  padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                }}
              >
                {result.objects_updated} geändert
              </div>
            )}
            {result.objects_missing > 0 && (
              <div
                style={{
                  background: '#fef3c7', color: '#92400e', fontSize: '11px',
                  padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                }}
              >
                {result.objects_missing} fehlt
              </div>
            )}
          </div>
        )}
        {status === 'completed' && (
          <div style={{ textAlign: 'right' }}>
            <div className={editorLinkVariants()}>
              <Link
                to={
                  currentViewKey
                    ? `/admin/architecture-viewer/editor?view=${encodeURIComponent(currentViewKey)}`
                    : '/admin/architecture-viewer/editor'
                }
              >
                Zum Editor →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Error Detail */}
      {status === 'failed' && error && (
        <div
          style={{
            marginTop: '8px',
            borderRadius: '6px',
            background: '#fef2f2',
            padding: '8px',
          }}
        >
          <Text size="xs" color="error">
            {error}
          </Text>
          <div style={{ marginTop: '4px' }}>
            <Text size="xs" color="error">
              Details in Restate einsehbar
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
