import { useState } from 'react';

import Input from '@src/components/primitives/Input';
import PasswordToggleButton from '@src/features/admin-credentials/components/shared/PasswordToggleButton';

export interface TableInlineEditPasswordCellProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
}

/**
 * TableInlineEditPasswordCell – Inline-editable password cell with show/hide toggle.
 *
 * Same commit-on-blur / Enter-saves / Escape-reverts behaviour as
 * ``TableInlineEditCell``, but renders the input as ``type="password"`` by
 * default with a ``PasswordToggleButton`` to reveal the value.
 */
export default function TableInlineEditPasswordCell({ value, onSave }: TableInlineEditPasswordCellProps) {
  const [draft, setDraft] = useState(value);
  const [visible, setVisible] = useState(false);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === value || trimmed === '') {
      setDraft(value);
      return;
    }
    void onSave(trimmed);
  };

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setDraft(value);
              e.currentTarget.blur();
            }
          }}
        />
        <PasswordToggleButton
          visible={visible}
          onToggle={() => setVisible((v) => !v)}
          showLabel="Passwort anzeigen"
          hideLabel="Passwort verbergen"
        />
      </div>
    </span>
  );
}
