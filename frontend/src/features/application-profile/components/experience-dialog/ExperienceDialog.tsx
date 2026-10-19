/**
 * ExperienceDialog – Overlay zum Anlegen/Bearbeiten eines Erfahrungs-Projekts.
 *
 * Skalar-Felder (Rolle, Firma-intern, Projekt-Link, Zeitraum) plus die
 * Textblöcke je Sprache. Der DE/EN-Umschalter zeigt die Felder der aktiven
 * Sprache; beide Sprachen bleiben im Form-State und werden beim Speichern
 * gemeinsam in eine `translations`-Map geschrieben. Darunter pflegen zwei
 * Sub-Tabellen (DecisionSubTable / ProofSubTable) die geordneten Listen
 * `decisions` / `proofs` je Sprache.
 *
 * Muster: CommunicationFormDialog (Reset bei Open/Entry) und ContactForm
 * (FormProvider + FormField, nur `name` + `label`).
 */
import { useForm } from '@tanstack/react-form';
import { cva } from 'class-variance-authority';
import { useEffect, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Text from '@src/components/primitives/Text';
import type {
  DecisionLocaleFields,
  ExperienceCreate,
  ExperienceDecision,
  ExperienceLocaleFields,
  ExperienceOut,
  ExperienceProof,
  ExperienceUpdate,
  ProofLocaleFields,
} from '@src/lib/api/applicationProfile';
import { experienceCreateSchema } from '@src/lib/schemasGenerated';

import { useExperienceTable } from '../../hooks/useExperienceTable';
import { toFormValues } from '../../utils/experienceDialogFormValues';

import DecisionSubTable from './DecisionSubTable';
import ExperienceForm from './ExperienceForm';
import ProofSubTable from './ProofSubTable';

import type { DecisionRow } from './DecisionSubTable';
import type { ProofRow } from './ProofSubTable';
import type { ExperienceFormValues, ExperienceLocaleValues } from '../../utils/experienceDialogFormValues';

export interface ExperienceDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Called when the dialog should open/close. */
  onOpenChange: (open: boolean) => void;
  /** Existing project to edit (prefilled); `null` to create a new one. */
  experience?: ExperienceOut | null;
  /** Called after a successful save so the list can reload. */
  onSaved: () => void;
}

const scrollVariants = cva('max-h-dialog overflow-y-auto pr-1');

/** Trims a raw input value and maps an empty string to `null`. */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Create/Edit overlay for one experience project (scalar fields + DE/EN text blocks). */
export default function ExperienceDialog({
  open,
  onOpenChange,
  experience = null,
  onSaved,
}: ExperienceDialogProps) {
  const { create, update } = useExperienceTable();
  const [locale, setLocale] = useState<'de' | 'en'>('de');
  const [saving, setSaving] = useState(false);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [proofs, setProofs] = useState<ProofRow[]>([]);

  const form = useForm({
    defaultValues: toFormValues(experience),
    onSubmit: async ({ value }) => {
      setSaving(true);
      try {
        const payload = toPayload(value, decisions, proofs);
        if (experience) {
          await update(experience.id, payload);
        } else {
          await create({ ...payload, sort: 0 });
        }
        onSaved();
        onOpenChange(false);
      } finally {
        setSaving(false);
      }
    },
  });

  // Reset/prefill whenever the dialog opens (or the edited project changes).
  useEffect(() => {
    if (!open) return;
    setLocale('de');
    form.reset(toFormValues(experience));
    setDecisions(toDecisionRows(experience?.decisions ?? []));
    setProofs(toProofRows(experience?.proofs ?? []));
  }, [open, experience, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>{experience ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant={locale === 'de' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLocale('de')}
          >
            DE
          </Button>
          <Button
            variant={locale === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLocale('en')}
          >
            EN
          </Button>
          <Text as="span" size="xs" color="muted">
            Sprachversion der Textblöcke
          </Text>
        </div>

        <div className={scrollVariants()}>
          <ExperienceForm
            form={form}
            schema={experienceCreateSchema}
            locale={locale}
          />

          <div className="mt-6 flex flex-col gap-6">
            <DecisionSubTable items={decisions} locale={locale} onChange={setDecisions} />
            <ProofSubTable items={proofs} locale={locale} onChange={setProofs} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button
            onClick={() => void form.handleSubmit()}
            disabled={saving}
            loading={saving}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Normalizes one decision translation to a full payload object (empty → null). */
function toDecisionLocale(fields: DecisionLocaleFields | undefined): DecisionLocaleFields {
  return {
    title: emptyToNull(fields?.title ?? ''),
    body: emptyToNull(fields?.body ?? ''),
    discarded: emptyToNull(fields?.discarded ?? ''),
  };
}

/** Maps an existing decision child to the dialog-local row model. */
function toDecisionRows(items: ExperienceDecision[]): DecisionRow[] {
  return items.map((item) => ({ key: `decision-${item.id}`, translations: item.translations }));
}

/** Maps one locale's form values to the API text-block payload (empty → null). */
function toLocaleFields(values: ExperienceLocaleValues): ExperienceLocaleFields {
  return {
    context: emptyToNull(values.context),
    outcome: emptyToNull(values.outcome),
    problem: emptyToNull(values.problem),
    scope: emptyToNull(values.scope),
    solution_what: emptyToNull(values.solution_what),
    tech_stack: emptyToNull(values.tech_stack),
    evidence: emptyToNull(values.evidence),
  };
}

/**
 * Maps the form values to the API payload. Both locales and the sprachneutral
 * fields are always sent; `decisions`/`proofs` are written as ordered arrays
 * (`sort = index`) with the full DE/EN `translations` map per child.
 */
function toPayload(
  value: ExperienceFormValues,
  decisions: DecisionRow[],
  proofs: ProofRow[],
): ExperienceCreate & ExperienceUpdate {
  return {
    position: value.position.trim(),
    company: emptyToNull(value.company),
    project_url: emptyToNull(value.project_url),
    start_date: value.start_date,
    end_date: emptyToNull(value.end_date),
    translations: {
      de: toLocaleFields(value.translations.de),
      en: toLocaleFields(value.translations.en),
    },
    decisions: decisions.map((row, index) => ({
      sort: index,
      translations: {
        de: toDecisionLocale(row.translations.de),
        en: toDecisionLocale(row.translations.en),
      },
    })),
    proofs: proofs.map((row, index) => ({
      sort: index,
      translations: {
        de: toProofLocale(row.translations.de),
        en: toProofLocale(row.translations.en),
      },
    })),
  };
}

/** Normalizes one proof translation to a full payload object (empty → null). */
function toProofLocale(fields: ProofLocaleFields | undefined): ProofLocaleFields {
  return { text: emptyToNull(fields?.text ?? '') };
}

/** Maps an existing proof child to the dialog-local row model. */
function toProofRows(items: ExperienceProof[]): ProofRow[] {
  return items.map((item) => ({ key: `proof-${item.id}`, translations: item.translations }));
}
