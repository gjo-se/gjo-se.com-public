import { cva } from 'class-variance-authority';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';
import { Textarea } from '@src/components/vendor/shadcn/textarea';
import type { Annotation } from '@src/features/viscera/core/workspaceSchema';
import { formatDateOnly } from '@src/lib/formatDate';

import { AnnotationEditor } from './AnnotationEditor';

const textCellVariants = cva('min-w-0 break-words');
const addHeaderVariants = cva('border-t border-gray-100 pt-3 dark:border-gray-800');


export interface AnnotationsTabProps {
  annotations: Annotation[];
  editingIndex: number | null;
  editText: string;
  newAnnotationText: string;
  isSaving: boolean;
  onAdd: () => void;
  onStartEdit: (index: number) => void;
  onSaveEdit: (text: string) => void;
  onCancelEdit: () => void;
  onDelete: (index: number) => void;
  onNewTextChange: (text: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 *
 */
export function AnnotationsTab({
  annotations, editingIndex, editText, newAnnotationText, isSaving,
  onAdd, onStartEdit, onSaveEdit, onCancelEdit, onDelete, onNewTextChange,
}: AnnotationsTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Existing annotations */}
      {annotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <Text color="muted" size="sm">Keine Annotationen vorhanden</Text>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
          {annotations.map((annotation, index) => (
            <div key={`${annotation.date}-${annotation.text}`} className="py-3 px-1">
              {editingIndex === index ? (
                <AnnotationEditor
                  initialText={editText}
                  onSave={onSaveEdit}
                  onCancel={onCancelEdit}
                  isSaving={isSaving}
                />
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className={textCellVariants()}>
                      <Text size="sm">{annotation.text}</Text>
                    </div>
                    <div className="shrink-0">
                      <Text size="xs" color="muted" align="right">
                        {formatDateOnly(annotation.date)}
                      </Text>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <Text size="xs" color="muted">{annotation.author}</Text>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onStartEdit(index)} disabled={isSaving}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(index)} disabled={isSaving}>
                        {'\u00D7'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new annotation */}
      <div className="flex flex-col gap-2">
        <div className={addHeaderVariants()}>
          <Text as="span" weight="semibold" size="sm">
            {'\u2795'} Annotation hinzuf\u00FCgen
          </Text>
        </div>
        <Textarea
          value={newAnnotationText}
          onChange={(e) => onNewTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(); }
          }}
          placeholder="Kommentar eingeben..."
          rows={2}
        />
        <div className="mt-2 flex justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={onAdd}
            disabled={!newAnnotationText.trim() || isSaving}
          >
            {isSaving ? 'Speichere...' : 'Hinzuf\u00FCgen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
