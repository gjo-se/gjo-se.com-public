/**
 * ScoreCriterionDialog – zeigt die Kriterien-Aufschlüsselung eines Score-Laufs.
 *
 * Listet die 11 Kanon-Kriterien (deutsches Label, Wert in %, Gewicht,
 * Begründung/Beleg/Fix) sowie die extrahierten Anforderungen (Muss/Kann).
 * Die Kriterien kommen bereits im Run-Payload mit – kein zusätzlicher Fetch.
 */
import { cva } from 'class-variance-authority';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';

import Button from '@src/components/primitives/Button';
import Checkbox from '@src/components/primitives/Checkbox';
import Chip from '@src/components/primitives/Chip';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Icon from '@src/components/primitives/Icon';
import List from '@src/components/primitives/List';
import Text from '@src/components/primitives/Text';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';
import { formatDate } from '@src/lib/formatDate';

import { excludeCvSkill } from '../../services/applicationCvSkillService';
import {
  CRITERION_KIND,
  CRITERION_LABELS,
  CRITERION_ORDER,
  GROUP_LABELS,
  HARD_FACT_FORMULAS,
  METHODIK_NOTES,
  REQUIREMENT_COVERAGE_LABELS,
  VERDICT_LABELS,
  criterionLabel,
  requirementCoverageCounter,
} from '../../shared/applicationScoreLabels';

import AddCvSkillsDialog from './AddCvSkillsDialog';

import type {
  ApplicationScoreCriterionOut,
  ApplicationScoreRequirement,
  ApplicationScoreRunOut,
  ScoreVerdict,
} from '../../services/applicationScoreService';
import type { ReactNode } from 'react';

export interface ScoreCriterionDialogProps {
  /** Der angezeigte Lauf; `null` schließt den Dialog. */
  run: ApplicationScoreRunOut | null;
  /** Öffnen-/Schließen-Callback (controlled). */
  onOpenChange: (open: boolean) => void;
  /**
   * Ausgewählte fehlende Muss-Anforderungen (controlled). Ohne diese Prop
   * hält der Dialog die Auswahl in lokalem State.
   */
  selectedMissing?: Set<string>;
  /** Callback bei Änderung der Auswahl fehlender Muss-Anforderungen. */
  onSelectionChange?: (selected: Set<string>) => void;
  /** Vorgangs-ID; ohne sie ist die Batch-Aktion „Skills hinzufügen" deaktiviert. */
  submissionId?: number;
  /** Optionaler Callback, um nach dem Hinzufügen einen neuen Score-Lauf anzustoßen. */
  onReScore?: () => void;
  /** Optionaler Callback, um nach einem Skill-Ausschluss die Runs (Reconcile) neu zu laden. */
  onExcluded?: () => void;
}

/** Scrollfläche, umbruchfreie Wertspalte und Methodik-Panel des Dialogs. */
const scrollPaneVariants = cva('max-h-dialog-lg overflow-y-auto pr-1');
const valueWrapVariants = cva('whitespace-nowrap');
const methodikPanelVariants = cva(
  'mt-3 flex flex-col gap-4 rounded-md border border-gray-200 p-3 dark:border-gray-800',
);

/** Sortier-Rang der Coverage: fehlend (false) zuerst, dann unbewertet (null), dann vorhanden (true). */
function coverageRank(covered: boolean | null): number {
  if (covered === false) return 0;
  if (covered === null) return 1;
  return 2;
}

/** Beitrag eines Kriteriums zum Gesamtscore: `Wert × Gewicht` (2 NK) oder `–`. */
function criterionContribution(criterion: ApplicationScoreCriterionOut): string {
  if (criterion.value == null) return '\u2013';
  return `${(criterion.value * criterion.weight).toFixed(2)} von ${criterion.weight}`;
}

/** Rendert eine Kriterium-Zeile mit Label, Wert %, Gewicht und Notizen. */
function renderCriterionRow(
  run: ApplicationScoreRunOut,
  criterionKey: string,
): ReactNode {
  const criterion = run.criteria.find((c) => c.criterionKey === criterionKey);
  const resolvedLabel = criterionLabel(criterionKey);
  const label =
    resolvedLabel === criterionKey
      ? (GROUP_LABELS[criterion?.groupKey ?? ''] ?? criterionKey)
      : resolvedLabel;
  const kind = CRITERION_KIND[criterionKey];
  const formula = HARD_FACT_FORMULAS[criterionKey];
  const isGap = criterion?.value == null;
  // ``must_skills`` detail is the requirement list above – its prose would be a
  // redundant restatement, so the row shows only label + value.
  const showProse = criterionKey !== 'must_skills';

  return (
    <div key={criterionKey} className="flex flex-col gap-1 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <Text as="span" size="sm" weight="medium">
          {label}
        </Text>
        <div className={valueWrapVariants()}>
          <Text as="span" size="sm" tabular>
            {criterion?.value == null
              ? '\u2013'
              : `${Math.round(criterion.value * 100)} %`}
            {criterion ? ` · Gewicht ${criterion.weight}` : ''}
            {criterion ? ` · Beitrag ${criterionContribution(criterion)}` : ''}
          </Text>
        </div>
      </div>
      {(kind || criterion) && (
        <div className="flex flex-wrap items-center gap-2">
          {kind && (
            <Chip size="sm" variant={kind === 'hard' ? 'info' : 'muted'}>
              {kind === 'hard' ? 'deterministisch' : 'LLM'}
            </Chip>
          )}
          {isGap && (
            <Text as="span" size="xs" color="muted">
              Datenlücke – nicht bewertet (zählt als untere Schranke)
            </Text>
          )}
        </div>
      )}
      {showProse && criterion?.reason && (
        <Text as="span" size="xs" color="muted">
          Begründung: {criterion.reason}
        </Text>
      )}
      {showProse && criterion?.evidence && (
        <Text as="span" size="xs" color="muted">
          Beleg: {criterion.evidence}
        </Text>
      )}
      {showProse && criterion?.action && (
        <Text as="span" size="xs" color="muted">
          Fix: {criterion.action}
        </Text>
      )}
      {formula && (
        <Text as="span" size="xs" color="muted">
          Formel: {formula}
        </Text>
      )}
    </div>
  );
}

/**
 * Rendert eine Anforderung als Soll/Ist-Zeile: Muss-Anforderungen tragen die
 * Coverage-Kennzeichnung (✓/✗); fehlende sind per Checkbox auswählbar.
 */
function renderRequirementRow(
  req: ApplicationScoreRequirement,
  selected: Set<string>,
  onToggle: (text: string) => void,
  options: {
    onExclude?: (name: string) => void;
    excludedNames: Set<string>;
    excludingName: string | null;
  },
): ReactNode {
  const isMust = req.kind === 'must';
  const selectable = isMust && req.covered === false;
  const coverageChip =
    isMust && req.covered === false ? (
      <Chip size="sm" variant="error">
        {REQUIREMENT_COVERAGE_LABELS.missing}
      </Chip>
    ) : isMust && req.covered === true ? (
      <Chip size="sm" variant="success">
        {REQUIREMENT_COVERAGE_LABELS.covered}
      </Chip>
    ) : null;

  return (
    <div key={`${req.kind}-${req.text}`} className="flex flex-col gap-1 py-1">
      <div className="flex items-start gap-2">
        {selectable && (
          <Checkbox
            checked={selected.has(req.text)}
            onChange={() => onToggle(req.text)}
            aria-label={`${req.text} auswählen`}
          />
        )}
        <div className="flex-1">
          <Text as="span" size="sm">
            {isMust ? 'Muss' : 'Kann'}: {req.text}
          </Text>
        </div>
        {coverageChip}
      </div>
      {req.cv_evidence && (
        <div className="flex items-center gap-1">
          <Text as="span" size="xs" color="muted">
            {req.cv_evidence}
          </Text>
          {options.excludedNames.has(req.cv_evidence) ? (
            <Chip size="sm" variant="muted">
              ausgeschlossen
            </Chip>
          ) : (
            options.onExclude && (
              <Button
                variant="ghost"
                size="xs"
                title="Aus CV ausschließen"
                aria-label={`${req.cv_evidence} aus CV ausschließen`}
                loading={options.excludingName === req.cv_evidence}
                disabled={options.excludingName !== null}
                onClick={() => options.onExclude?.(req.cv_evidence as string)}
              >
                {options.excludingName === req.cv_evidence ? null : (
                  <Icon name="x-circle" size="sm" />
                )}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/** Farbiger Verdict-Chip (ready=grün, borderline=amber, weak=rot). */
function renderVerdictChip(verdict: ScoreVerdict | null): ReactNode {
  if (!verdict) return <Text size="sm" color="muted">{'\u2013'}</Text>;
  const variant =
    verdict === 'ready'
      ? 'success'
      : verdict === 'borderline'
        ? 'warning'
        : 'error';
  return <Chip variant={variant}>{VERDICT_LABELS[verdict]}</Chip>;
}

/**
 * Dialog mit der Kriterien-Aufschlüsselung und den Anforderungen eines Runs.
 */
export default function ScoreCriterionDialog({
  run,
  onOpenChange,
  selectedMissing: selectedMissingProp,
  onSelectionChange,
  submissionId,
  onReScore,
  onExcluded,
}: ScoreCriterionDialogProps) {
  const [showMethodik, setShowMethodik] = useState(false);
  const [addSkillsOpen, setAddSkillsOpen] = useState(false);
  const [skillsAdded, setSkillsAdded] = useState(false);
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());
  const [excludingName, setExcludingName] = useState<string | null>(null);
  const [internalSelectedMissing, setInternalSelectedMissing] = useState<Set<string>>(
    new Set(),
  );

  if (!run) return null;

  const handleExclude = async (name: string): Promise<void> => {
    if (submissionId == null) return;
    setExcludingName(name);
    try {
      await excludeCvSkill(submissionId, name);
      setExcludedNames((prev) => new Set(prev).add(name));
      toast.success(`„${name}“ aus dem CV ausgeschlossen.`);
      onExcluded?.();
    } catch (err) {
      showErrorToast(extractApiError(err));
    } finally {
      setExcludingName(null);
    }
  };
  const requirementRowOptions = {
    onExclude: submissionId != null ? (name: string) => void handleExclude(name) : undefined,
    excludedNames,
    excludingName,
  };

  const selectedMissing = selectedMissingProp ?? internalSelectedMissing;
  const toggleMissingSelection = (text: string): void => {
    const next = new Set(selectedMissing);
    if (next.has(text)) next.delete(text);
    else next.add(text);
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelectedMissing(next);
  };

  const mustRequirements = run.requirements.filter((req) => req.kind === 'must');
  const niceRequirements = run.requirements.filter((req) => req.kind === 'nice');
  const sortedMust = [...mustRequirements].sort(
    (a, b) => coverageRank(a.covered) - coverageRank(b.covered),
  );
  const missingCount = mustRequirements.filter((req) => req.covered === false).length;
  const selectedMissingSkills = sortedMust
    .filter((req) => req.covered === false && selectedMissing.has(req.text))
    .map((req) => req.text);

  const weightFor = (key: string): string => {
    const criterion = run.criteria.find((c) => c.criterionKey === key);
    return criterion ? `${criterion.weight}` : '\u2013';
  };
  const hardFactKeys = CRITERION_ORDER.filter(
    (key) => CRITERION_KIND[key] === 'hard' && HARD_FACT_FORMULAS[key],
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>Score-Details</DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Text as="span" size="sm" color="muted">
                {formatDate(run.createdAt)}
              </Text>
              <Text as="span" size="sm" color="muted">
                Gesamt {run.totalScore == null ? '\u2013' : run.totalScore.toFixed(2)}
              </Text>
              <Text as="span" size="sm" color="muted">
                Coverage {run.assessed_weight} %
                {run.is_lower_bound ? ' (untere Schranke)' : ''}
              </Text>
              <Text as="span" size="sm" color="muted">
                Güte {run.normalizedScore == null ? '\u2013' : run.normalizedScore.toFixed(2)}
              </Text>
              {run.isConclusive ? (
                renderVerdictChip(run.verdict)
              ) : (
                <Chip variant="warning">nicht abschließend bewertbar</Chip>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className={scrollPaneVariants()}>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {CRITERION_ORDER.map((key) => (
              <Fragment key={key}>
                {renderCriterionRow(run, key)}
                {key === 'must_skills' && run.requirements.length > 0 && (
                  <div className="pb-3">
                    {mustRequirements.length > 0 && (
                      <div className="mb-2">
                        <Text as="p" size="xs" color="muted">
                          Anforderungen (Muss/Kann) ·{' '}
                          {requirementCoverageCounter(missingCount, mustRequirements.length)}
                        </Text>
                      </div>
                    )}
                    {sortedMust.length > 0 && (
                      <List
                        items={sortedMust.map((req) =>
                          renderRequirementRow(req, selectedMissing, toggleMissingSelection, requirementRowOptions),
                        )}
                      />
                    )}
                    {niceRequirements.length > 0 && (
                      <div className={sortedMust.length > 0 ? 'mt-3' : undefined}>
                        <List
                          items={niceRequirements.map((req) =>
                            renderRequirementRow(req, selectedMissing, toggleMissingSelection, requirementRowOptions),
                          )}
                        />
                      </div>
                    )}
                    {submissionId != null && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={
                            selectedMissingSkills.length === 0 || addSkillsOpen || skillsAdded
                          }
                          onClick={() => setAddSkillsOpen(true)}
                        >
                          Jetzt Skills hinzufügen
                        </Button>
                        {skillsAdded && onReScore && (
                          <Button variant="ghost" size="sm" onClick={onReScore}>
                            Score neu berechnen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          <div className="mt-5">
            <Button
              variant="ghost"
              size="xs"
              aria-expanded={showMethodik}
              onClick={() => setShowMethodik((value) => !value)}
            >
              Methodik v1 {showMethodik ? 'ausblenden' : 'anzeigen'}
            </Button>

            {showMethodik && (
              <div className={methodikPanelVariants()}>
                <div>
                  <div className="mb-2">
                    <Text as="h3" variant="h6">
                      Gewichte
                    </Text>
                  </div>
                  <List
                    as="dl"
                    definitions={CRITERION_ORDER.map((key) => ({
                      dt: CRITERION_LABELS[key] ?? key,
                      dd: weightFor(key),
                    }))}
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <Text as="h3" variant="h6">
                      Hard-Facts (Formeln)
                    </Text>
                  </div>
                  <List
                    items={hardFactKeys.map((key) => (
                      <Text key={key} as="span" size="xs">
                        {criterionLabel(key)}: {HARD_FACT_FORMULAS[key]}
                      </Text>
                    ))}
                  />
                </div>

                <div>
                  <div className="mb-2">
                    <Text as="h3" variant="h6">
                      Hinweise
                    </Text>
                  </div>
                  <List
                    items={[
                      METHODIK_NOTES.thresholds,
                      METHODIK_NOTES.llm,
                      METHODIK_NOTES.language,
                    ].map((note) => (
                      <Text key={note} as="span" size="xs">
                        {note}
                      </Text>
                    ))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <Text as="p" size="xs" color="muted">
              Gewichte fix v1, Schwellen heuristisch, nicht kalibriert.
            </Text>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>

      {submissionId != null && (
        <AddCvSkillsDialog
          open={addSkillsOpen}
          onOpenChange={setAddSkillsOpen}
          submissionId={submissionId}
          skills={selectedMissingSkills}
          onAdded={() => setSkillsAdded(true)}
        />
      )}
    </Dialog>
  );
}
