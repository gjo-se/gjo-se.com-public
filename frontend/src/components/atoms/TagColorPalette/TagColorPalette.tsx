import { useCallback, useEffect, useRef } from 'react';

import { COLOR_TOKEN_CSS, COLOR_TOKEN_META, type ColorToken } from '@src/lib/colorTokens';
import { cn } from '@src/lib/utils';

import { TOKENS } from './TagColorPalette.utils';

import type { TagColorPaletteProps } from './TagColorPalette.interface';

/**
 * TagColorPalette – 13 colour swatches for selecting a ColorToken.
 *
 * Renders as a radiogroup with keyboard navigation (Arrow keys, Enter/Space),
 * roving tab-index and native tooltips.
 */
export default function TagColorPalette({
  value,
  onSelect,
  disabled = false,
}: TagColorPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Move DOM focus to the currently-selected button after value changes.
  useEffect(() => {
    const btn = containerRef.current?.querySelector<HTMLButtonElement>(
      `[data-token="${value}"]`,
    );
    btn?.focus();
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = TOKENS.indexOf(value as ColorToken);
      let nextIdx: number;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIdx = idx < 0 ? 0 : (idx + 1) % TOKENS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIdx = idx <= 0 ? TOKENS.length - 1 : idx - 1;
      } else {
        return;
      }

      onSelect(TOKENS[nextIdx]);
    },
    [value, onSelect],
  );

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Farbpalette"
      onKeyDown={handleKeyDown}
      className="flex flex-wrap gap-1"
    >
      {TOKENS.map((token) => {
        const selected = token === value;
        const meta = COLOR_TOKEN_META[token];
        const label = `${meta.label} · ${meta.hex}`;

        return (
          <button
            key={token}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            disabled={disabled}
            tabIndex={selected ? 0 : !value && token === TOKENS[0] ? 0 : -1}
            data-token={token}
            onClick={() => onSelect(token)}
            className={cn(
              'w-8 h-8 rounded-md cursor-pointer transition-all',
              COLOR_TOKEN_CSS[token].dot,
              selected && 'ring-2 ring-offset-1 ring-gray-900 dark:ring-gray-100',
              !disabled && !selected && 'hover:ring-1 hover:ring-gray-400',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          />
        );
      })}
    </div>
  );
}

export type { TagColorPaletteProps } from './TagColorPalette.interface';
