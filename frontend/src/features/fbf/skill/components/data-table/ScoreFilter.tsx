/**
 * ScoreFilter – Minimal score threshold filter (spinner).
 *
 * Exact copy of the AIScope Projects "Score ≥" pattern.
 * Wraps the Input primitive with min/max bounds and null handling.
 */

import Input from '@src/components/primitives/Input';

const MIN_SCORE = 0;
const MAX_SCORE = 5;

interface ScoreFilterProps {
  value: number | null
  onChange: (value: number | null) => void
  placeholder: string
}

/**
 *
 */
export default function ScoreFilter({ value, onChange, placeholder }: ScoreFilterProps) {
  return (
    <div className="basis-20">
      <Input
        type="number"
        min={MIN_SCORE}
        max={MAX_SCORE}
        step={1}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </div>
  );
}
