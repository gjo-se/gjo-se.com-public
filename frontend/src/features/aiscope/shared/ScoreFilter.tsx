/**
 * ScoreFilter – Numeric match-score threshold input for the projects toolbar.
 *
 * Server-side filter (min_score): rows with match_score below the value are
 * excluded. Empty input clears the filter.
 */

import { cva } from 'class-variance-authority';

import Input from '@src/components/primitives/Input';

const MIN_SCORE = 0;
const MAX_SCORE = 100;

const wrapperVariants = cva('w-32');

interface ScoreFilterProps {
  value: number | null
  onChange: (value: number | null) => void
}

/** Renders the match-score threshold input (min_score) for the toolbar. */
export default function ScoreFilter({ value, onChange }: ScoreFilterProps) {
  return (
    <div className={wrapperVariants()}>
      <Input
        type="number"
        min={MIN_SCORE}
        max={MAX_SCORE}
        value={value ?? ''}
        placeholder="Score ≥"
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </div>
  );
}
