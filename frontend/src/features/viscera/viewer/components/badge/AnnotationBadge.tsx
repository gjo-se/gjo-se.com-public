import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@src/components/primitives/Button/Button';
import { Textarea } from '@src/components/vendor/shadcn/textarea';
import type { Annotation } from '@src/features/viscera/core/workspaceSchema';

// ── Constants ────────────────────────────────────────────────────────────────

const BADGE_WIDTH = 48;
const BADGE_HEIGHT = 18;
const BADGE_BG = '#3b82f6';
const BADGE_X_OFFSET = 82; // From right edge
const BADGE_Y_OFFSET = 28; // From bottom edge

// ── Props ────────────────────────────────────────────────────────────────────

export interface AnnotationBadgeProps {
  /** Current annotations on the object. */
  annotations: Annotation[];
  /** Called when a new annotation is submitted. */
  onAdd: (text: string) => void;
  /** Card width for right-aligned positioning. */
  cardWidth: number;
  /** Card height for bottom-aligned positioning. */
  cardHeight: number;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * SVG badge that shows annotation count on viscera cards.
 *
 * - Hidden when there are no annotations.
 * - Hover shows the last annotation text as a tooltip.
 * - Click opens a portal-based textarea for adding a new annotation.
 */
export default function AnnotationBadge({
  annotations,
  onAdd,
  cardWidth,
  cardHeight,
}: AnnotationBadgeProps) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');

  const handleBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInput((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
    setShowInput(false);
  }, [text, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setShowInput(false);
        setText('');
      }
    },
    [handleSubmit],
  );

  const handleCancel = useCallback(() => {
    setShowInput(false);
    setText('');
  }, []);

  const count = annotations.length;
  if (count === 0) return null;

  const lastAnnotation = annotations[annotations.length - 1];
  const tooltip = lastAnnotation
    ? `\u{1F4AC} ${lastAnnotation.author}: ${lastAnnotation.text}`
    : '';

  const badgeX = cardWidth - BADGE_X_OFFSET;
  const badgeY = cardHeight - BADGE_Y_OFFSET;

  return (
    <>
      {/* Badge in SVG */}
      <g
        transform={`translate(${badgeX}, ${badgeY})`}
        onClick={handleBadgeClick}
        style={{ cursor: 'pointer' }}
      >
        {tooltip && <title>{tooltip}</title>}
        <rect
          x={0}
          y={0}
          width={BADGE_WIDTH}
          height={BADGE_HEIGHT}
          rx={4}
          fill={BADGE_BG}
          opacity={0.9}
        />
        <text
          x={BADGE_WIDTH / 2}
          y={13}
          textAnchor="middle"
          className="fill-white"
          fontSize={10}
          fontWeight="bold"
        >
          {'\uD83D\uDCAC'} {count}
        </text>
      </g>

      {/* Annotation input (portal) */}
      {showInput &&
        createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
            onClick={handleCancel}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px',
                minWidth: '300px',
                maxWidth: '400px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-muted)',
                }}
              >
                Annotation hinzuf\u00FCgen
              </div>
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Kommentar eingeben..."
                rows={3}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '12px',
                }}
              >
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Abbrechen
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                >
                  Speichern
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
