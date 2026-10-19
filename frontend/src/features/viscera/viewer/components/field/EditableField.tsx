import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input/Input';
import Text from '@src/components/primitives/Text/Text';
import Textarea from '@src/components/primitives/Textarea/Textarea';

import type { WriteResult } from '../../hooks/useYamlWrite';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EditableFieldProps {
  /** Current value of the field. */
  value: string;
  /** Field identifier (e.g. "name", "description"). */
  field: string;
  /** Dot-separated object ID (e.g. "backend" or "backend.fastapi"). */
  objectId: string;
  /** Callback invoked on save. Returns write result for feedback. */
  onSave: (objectId: string, field: string, value: unknown) => Promise<WriteResult>;
  /** Use a textarea instead of a single-line input. */
  multiline?: boolean;
  /** Inline bulk-validation error to display below the field value. */
  error?: string;
}

type EditState = 'view' | 'edit' | 'saved' | 'error';

const FEEDBACK_DURATION_MS = 2000;

const textCellVariants = cva('min-w-0 break-words');
const inlineErrorVariants = cva('mt-1 text-red-600');

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Inline-editable field for the ObjectDetailsPanel.
 *
 * - Click on value → switches to edit mode (input/textarea with autoFocus)
 * - Enter/Blur → save via ``onSave`` callback
 * - Escape → cancel, restore original value
 * - Visual feedback: green checkmark after save, red cross on error
 * - If ``error`` prop is set, a red hint is displayed below the field value
 */
export function EditableField({
  value: initialValue,
  field,
  objectId,
  onSave,
  multiline = false,
  error,
}: EditableFieldProps) {
  const [state, setState] = useState<EditState>('view');
  const [editValue, setEditValue] = useState(initialValue);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [editKey, setEditKey] = useState(0); // remount key for autoFocus on each edit entry
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset edit value when initialValue changes externally
  useEffect(() => {
    setEditValue(initialValue);
  }, [initialValue]);

  const enterEdit = useCallback(() => {
    setEditValue(initialValue);
    setState('edit');
    setFeedbackError(null);
    setEditKey((prev) => prev + 1);
  }, [initialValue]);

  const cancelEdit = useCallback(() => {
    setEditValue(initialValue);
    setState('view');
    setFeedbackError(null);
  }, [initialValue]);

  const handleSave = useCallback(async () => {
    if (editValue === initialValue) {
      setState('view');
      return;
    }

    const result = await onSave(objectId, field, editValue);
    if (result.success) {
      setState('saved');
      setFeedbackError(null);
      setTimeout(() => setState('view'), FEEDBACK_DURATION_MS);
    } else {
      setState('error');
      setFeedbackError(result.error ?? 'Unknown error');
    }
  }, [editValue, initialValue, onSave, objectId, field]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [handleSave, cancelEdit],
  );

  const handleBlur = useCallback(() => {
    if (state === 'edit') {
      handleSave();
    }
  }, [state, handleSave]);

  // ── View mode ──────────────────────────────────────────────────────────

  if (state === 'view' || state === 'saved' || state === 'error') {
    return (
      <div className="flex flex-col">
        <Button variant="ghost" size="sm" onClick={enterEdit}>
          <div className={textCellVariants()}>
            <Text size="sm">
              {editValue || '\u2014'}
            </Text>
          </div>
          {state === 'saved' && (
            <>
              <Icon name="check" size="xs" variant="default" />
              <Text size="xs" color="muted">
                Saved
              </Text>
            </>
          )}
          {state === 'error' && feedbackError && (
            <>
              <Icon name="x" size="xs" variant="default" />
              <Text size="xs" color="muted">
                {feedbackError}
              </Text>
            </>
          )}
        </Button>
        {error && (
          <div className={inlineErrorVariants()}>
            <Text size="xs" color="inherit">
              {'\u26A0 '}{error}
            </Text>
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────

  return (
    <div>
      {multiline ? (
        <Textarea
          ref={textareaRef}
          key={editKey}
          value={editValue}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setEditValue(e.target.value)
          }
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <Input
          key={editKey}
          value={editValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEditValue(e.target.value)
          }
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      )}
    </div>
  );
}
