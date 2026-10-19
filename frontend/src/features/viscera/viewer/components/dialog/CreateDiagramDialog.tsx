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
import type { Diagram } from '@src/features/viscera/core/workspaceSchema';

import DescriptionField from './DescriptionField';
import DialogErrorText from './DialogErrorText';
import FieldLabel from './FieldLabel';
import ParentDiagramCombobox from './ParentDiagramCombobox';


// ── Props ────────────────────────────────────────────────────────────────────

export interface CreateDiagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the filled-in form data on confirm (create mode). */
  onCreated: (data: CreateDiagramFormData) => Promise<void>;
  /** Whether a create/edit request is currently in flight. */
  isSubmitting?: boolean;
  /** Server error message to display. */
  error?: string | null;
  /** When set, dialog operates in edit mode with pre-filled fields (#2254). */
  diagram?: Diagram;
  /** Called on save in edit mode instead of onCreated. */
  onEdited?: (data: CreateDiagramFormData) => Promise<void>;
}

interface CreateDiagramFormData {
  key: string;
  name: string;
  type: string;
  description: string | null;
  parent: string | null;
  layout: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DIAGRAM_TYPES = [
  { value: 'systemContext', label: 'L1 – Context' },
  { value: 'container', label: 'L2 – Container' },
  { value: 'component', label: 'L3 – Component' },
] as const;
const LAYOUTS = [
  { value: 'lr', label: 'Left to Right' },
  { value: 'tb', label: 'Top to Bottom' },
  { value: 'rl', label: 'Right to Left' },
  { value: 'bt', label: 'Bottom to Top' },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

/** Dialog to create or edit an architecture diagram. */
export default function CreateDiagramDialog({
  open,
  onOpenChange,
  onCreated,
  isSubmitting = false,
  error,
  diagram,
  onEdited,
}: CreateDiagramDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('systemContext');
  const [description, setDescription] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [layout, setLayout] = useState<string>('lr');

  const isEditMode = !!diagram;

  // Pre-fill form when opening in edit mode (adjusting state during render).
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevDiagram, setPrevDiagram] = useState(diagram);
  if (open !== prevOpen || diagram !== prevDiagram) {
    setPrevOpen(open);
    setPrevDiagram(diagram);
    if (open && diagram) {
      setName(diagram.name);
      setType(diagram.type);
      setDescription(diagram.description ?? '');
      setParent(diagram.parent ?? null);
      setLayout(diagram.layout ?? 'lr');
    }
  }

  /** Auto-derive key from name: strip all non-alphanumeric characters. */
  const derivedKey = useMemo(() => {
    if (isEditMode) return diagram?.key ?? '';
    return name.replace(/[^A-Za-z0-9]/g, '');
  }, [name, isEditMode, diagram]);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      type.length > 0 &&
      (!isEditMode ? derivedKey.length > 0 : true) &&
      !isSubmitting,
    [name, type, derivedKey, isEditMode, isSubmitting],
  );

  const handleConfirm = useCallback(async () => {
    if (!canSubmit) return;
    const formData: CreateDiagramFormData = {
      key: isEditMode ? (diagram?.key ?? '') : derivedKey,
      name: name.trim(),
      type,
      description: description.trim() || null,
      parent: parent || null,
      layout: layout || null,
    };
    if (isEditMode && onEdited) {
      await onEdited(formData);
    } else {
      await onCreated(formData);
    }
  }, [canSubmit, derivedKey, name, type, description, parent, layout, isEditMode, diagram, onCreated, onEdited]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setName('');
        setType('systemContext');
        setDescription('');
        setParent(null);
        setLayout('lr');
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const typeLabel = DIAGRAM_TYPES.find((o) => o.value === type)?.label;
  const layoutLabel = LAYOUTS.find((o) => o.value === layout)?.label;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Diagramm bearbeiten' : 'Neues Diagramm erstellen'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Diagramm-Metadaten bearbeiten. Der Key kann nicht geändert werden.'
              : 'Ein neues Diagramm anlegen. Der Key wird automatisch aus dem Namen abgeleitet.'}
          </DialogDescription>
        </DialogHeader>

        {/* Name + derived Key */}
        <div className="flex flex-col gap-1.5">
          <Input
            id="create-diagram-name"
            label="Name *"
            placeholder="z.B. Monitoring Dashboard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
          {isEditMode ? (
            <Text size="xs" color="muted">
              Key: <Text as="span" size="xs" color="muted" mono>{derivedKey}</Text>
            </Text>
          ) : (
            derivedKey.length > 0 && (
              <Text size="xs" color="muted">
                Key: <Text as="span" size="xs" color="muted" mono>{derivedKey}</Text> (aus Name abgeleitet)
              </Text>
            )
          )}
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="create-diagram-type" label="Typ *" />
          <Select
            value={type}
            onValueChange={(value) => {
              if (value !== null) setType(value);
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger id="create-diagram-type" className="w-full">
              <SelectValue placeholder="Typ wählen">{typeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DIAGRAM_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Layout */}
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="create-diagram-layout" label="Layout" optional />
          <Select
            value={layout}
            onValueChange={(value) => {
              if (value !== null) setLayout(value);
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger id="create-diagram-layout" className="w-full">
              <SelectValue placeholder="Layout wählen">{layoutLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LAYOUTS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parent */}
        <ParentDiagramCombobox
          diagramType={type}
          value={parent}
          onChange={setParent}
          disabled={isSubmitting}
        />

        {/* Description */}
        <DescriptionField
          id="create-diagram-description"
          value={description}
          onChange={setDescription}
          placeholder="Was zeigt dieses Diagramm?"
          disabled={isSubmitting}
        />

        {/* Error */}
        <DialogErrorText error={error} />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            {isSubmitting ? 'Speichere…' : isEditMode ? 'Speichern' : 'Diagramm erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
