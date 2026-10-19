import { useCallback, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Input from '@src/components/primitives/Input/Input';
import Text from '@src/components/primitives/Text/Text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/vendor/shadcn/select';

import DescriptionField from './DescriptionField';
import DialogErrorText from './DialogErrorText';
import FieldLabel from './FieldLabel';

// ── Props ────────────────────────────────────────────────────────────────────

export interface CreateObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the filled-in form data on confirm. */
  onCreated: (data: {
    id: string;
    name: string;
    type: string | null;
    description: string | null;
    parent?: string;
  }) => void;
  prefill?: CreateObjectPrefill;
  /** Whether a create request is currently in flight. */
  isSubmitting?: boolean;
  /** Server error message to display. */
  error?: string | null;
  /**
   * Dialog mode.
   * - `'full'` (default): All fields — used for context menu creation.
   * - `'inline'`: Name + ID only — fallback for inline creation (rarely used).
   */
  mode?: 'full' | 'inline';
}

interface CreateObjectPrefill {
  parent?: string;
  type?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = ['System', 'Container', 'Component'] as const;

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]*$/;

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Dialog to create a new architecture object (System, Container, or Component).
 *
 * When prefilled via context menu (parent + type), the type dropdown is disabled
 * and the ID field is prefilled as ``{parent}.``.
 */
export default function CreateObjectDialog({
  open,
  onOpenChange,
  onCreated,
  prefill,
  isSubmitting = false,
  error,
  mode = 'full',
}: CreateObjectDialogProps) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(prefill?.type ?? 'System');
  const [description, setDescription] = useState('');

  const isPrefilled = prefill?.type !== undefined;
  const isInline = mode === 'inline';
  const parentId = prefill?.parent;

  const idValidation = useMemo(() => {
    if (!id.trim()) return { valid: false, message: 'ID ist erforderlich' };
    if (!ID_PATTERN.test(id)) return { valid: false, message: 'ID-Format: dot-separated, nur Buchstaben, Zahlen, Punkte, Bindestriche' };
    return { valid: true, message: '' };
  }, [id]);

  const canSubmit = useMemo(
    () => id.trim().length > 0 && name.trim().length > 0 && idValidation.valid && !isSubmitting,
    [id, name, idValidation.valid, isSubmitting],
  );

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // If prefilled with parent, enforce parent prefix
      if (parentId && !e.target.value.startsWith(parentId + '.')) {
        setId(parentId + '.');
        return;
      }
      setId(e.target.value);
    },
    [parentId],
  );

  const handleConfirm = useCallback(() => {
    if (!canSubmit) return;
    onCreated({
      id: id.trim(),
      name: name.trim(),
      type: type || null,
      description: description.trim() || null,
      parent: parentId,
    });
  }, [canSubmit, id, name, type, description, parentId, onCreated]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setId('');
        setName('');
        setType(prefill?.type ?? 'System');
        setDescription('');
      } else if (parentId) {
        setId(parentId + '.');
      }
      onOpenChange(next);
    },
    [onOpenChange, prefill, parentId],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isPrefilled ? `Neue${type ? ' ' + type : ''} erstellen` : 'Neues Objekt erstellen'}
          </DialogTitle>
          <DialogDescription>
            Ein neues Architecture-Objekt im Diagramm anlegen. Es wird mit Status{' '}
            <Text as="span" size="sm" weight="semibold">pending</Text> erstellt.
          </DialogDescription>
        </DialogHeader>

        {/* ID */}
        <div className="flex flex-col gap-1.5">
          <Input
            id="create-object-id"
            label={isInline ? 'ID (Auto-generiert)' : 'ID *'}
            placeholder={parentId ? `${parentId}.name` : 'z.B. backend.auth-service'}
            value={id}
            onChange={handleIdChange}
            disabled={isInline || isSubmitting}
            error={!idValidation.valid && id.length > 0}
            helperText={
              isInline
                ? 'Wird automatisch aus dem Namen abgeleitet'
                : (id.length > 0 && !idValidation.valid ? idValidation.message : undefined)
            }
          />
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Input
            id="create-object-name"
            label={isInline ? 'Name (Auto-gespeichert bei Enter)' : 'Name *'}
            placeholder="z.B. Auth Service"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Type — only in full mode */}
        {!isInline && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="create-object-type" label="Typ *" />
            <Select
              value={type}
              onValueChange={(value) => {
                if (value !== null) setType(value);
              }}
              disabled={isPrefilled || isSubmitting}
            >
              <SelectTrigger id="create-object-type" className="w-full">
                <SelectValue placeholder="Typ wählen" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Description — only in full mode */}
        {!isInline && (
          <DescriptionField
            id="create-object-description"
            value={description}
            onChange={setDescription}
            placeholder="Was macht dieses Objekt?"
            disabled={isSubmitting}
          />
        )}

        {/* Error */}
        <DialogErrorText error={error} />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            {isSubmitting ? 'Erstelle…' : 'Objekt erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
