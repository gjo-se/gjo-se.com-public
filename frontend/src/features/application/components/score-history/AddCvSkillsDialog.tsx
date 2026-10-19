/**
 * AddCvSkillsDialog – bestätigt fehlende Muss-Skills und sendet sie als EINEN
 * Batch an das Backend, das je Skill einen Slave auflöst/erzeugt, ihn über die
 * Dedup-Pipeline dem wahrscheinlichsten Master zuordnet und das CV einmalig neu
 * rendert.
 *
 * Es wird nur der Name gesendet: Gruppe/Level/Importance steuert ausschließlich
 * der Master. Der Name ist mit dem erkannten Text vorbelegt und editierbar.
 */
import { cva } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import { showErrorToast } from '@src/lib/errorToast';

import { addCvSkills } from '../../services/applicationCvSkillService';

export interface AddCvSkillsDialogProps {
  /** Steuert das Öffnen/Schließen des Dialogs (controlled). */
  open: boolean;
  /** Öffnen-/Schließen-Callback. */
  onOpenChange: (open: boolean) => void;
  /** Vorgangs-ID, an deren CV die Skills gehängt werden. */
  submissionId: number;
  /** Ausgewählte Skill-Texte; je Eintrag eine editierbare Zeile. */
  skills: string[];
  /** Callback nach erfolgreichem Batch-Add (vor dem Schließen). */
  onAdded?: () => void;
}

/** Editierbare Zeile je Skill (nur Name). */
interface SkillRow {
  id: string;
  name: string;
}

/** Scrollfläche des Dialogs. */
const scrollPaneVariants = cva('max-h-half-viewport overflow-y-auto pr-1');

/**
 * Dialog zum Batch-Add fehlender Skills ins CV.
 */
export default function AddCvSkillsDialog({
  open,
  onOpenChange,
  submissionId,
  skills,
  onAdded,
}: AddCvSkillsDialogProps) {
  const [rows, setRows] = useState<SkillRow[]>(() => buildRows(skills));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(buildRows(skills));
  }, [open, skills]);

  const updateRow = (id: string, name: string): void => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, name } : row)));
  };

  const allRowsValid = rows.length > 0 && rows.every((row) => row.name.trim().length > 0);
  const canSubmit = allRowsValid && !submitting;

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addCvSkills(
        submissionId,
        rows.map((row) => ({ name: row.name.trim() })),
      );
      toast.success('CV neu erzeugt – Score neu berechnen für den aktualisierten Abgleich.');
      onAdded?.();
      onOpenChange(false);
    } catch (err: unknown) {
      showErrorToast(
        `Skills konnten nicht hinzugefügt werden: ${
          err instanceof Error ? err.message : 'Unbekannter Fehler'
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>Skills zum CV hinzufügen</DialogTitle>
          <DialogDescription>
            <Text as="span" size="sm" color="muted">
              Namen prüfen – jeder Skill wird seinem Master zugeordnet und das CV
              einmalig neu erzeugt.
            </Text>
          </DialogDescription>
        </DialogHeader>

        <div className={scrollPaneVariants()}>
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <Input
                key={row.id}
                id={`cv-skill-name-${row.id}`}
                label="Skill-Name"
                value={row.name}
                onChange={(event) => updateRow(row.id, event.target.value)}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            size="sm"
            loading={submitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            Jetzt Skills hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Baut die initialen Zeilen aus den ausgewählten Skill-Texten. */
function buildRows(skills: string[]): SkillRow[] {
  return skills.map((name) => ({ id: crypto.randomUUID(), name }));
}
