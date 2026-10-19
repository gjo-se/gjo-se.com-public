import { useEffect, useRef, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Input from '@src/components/primitives/Input';

import { clickToEditCellWrapperVariants } from './ClickToEditCell.variants';

interface ClickToEditCellProps {
  value: string | null;
  onSave: (v: string) => Promise<void>;
}

/** Click-to-edit cell (DetailTable pattern: text → click → Input). */
export default function ClickToEditCell({ value, onSave }: ClickToEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) wrapperRef.current?.querySelector('input')?.focus();
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    if (val !== (value ?? '')) await onSave(val);
  };

  const cancel = () => {
    setEditing(false);
    setVal(value ?? '');
  };

  if (editing) {
    return (
      <div ref={wrapperRef} className={clickToEditCellWrapperVariants()}>
        <Input
          value={val}
          onChange={(e) => setVal((e.target as HTMLInputElement).value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); void commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
        />
      </div>
    );
  }

  return (
    <Button
      variant="cell"
      onClick={() => { setVal(value ?? ''); setEditing(true); }}
    >
      {value || '\u2013'}
    </Button>
  );
}

export type { ClickToEditCellVariants } from './ClickToEditCell.variants';
