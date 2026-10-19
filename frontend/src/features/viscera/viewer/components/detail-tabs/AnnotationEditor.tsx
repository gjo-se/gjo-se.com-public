import { type KeyboardEvent, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import { Textarea } from '@src/components/vendor/shadcn/textarea';

export interface AnnotationEditorProps {
  /** Initial text to populate the editor. */
  initialText: string;
  /** Called when the user saves, with the trimmed text. */
  onSave: (text: string) => void;
  /** Called when the user cancels editing. */
  onCancel: () => void;
  /** Whether a save operation is in progress. */
  isSaving: boolean;
}

/**
 * Inline-edit component for a single annotation entry.
 * Manages its own local text state, supports Enter to save and Escape to cancel.
 */
export function AnnotationEditor({ initialText, onSave, onCancel, isSaving }: AnnotationEditorProps) {
  const [text, setText] = useState(initialText);

  const save = () => { if (text.trim()) onSave(text.trim()); };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} rows={2} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
        <Button variant="default" size="sm" onClick={save} disabled={!text.trim() || isSaving}>Speichern</Button>
      </div>
    </div>
  );
}
