/**
 * ApplicationVersionBar – switch between the application versions of a project
 * and prepare an additional one in another language.
 *
 * Pure presentational component: it only renders the given props and reports
 * the user's intent via callbacks. No API calls, no store access – the
 * surrounding dialog wires it to the `useApplicationFlow` hook.
 */
import Button from '@src/components/primitives/Button';
import NativeSelect from '@src/components/primitives/NativeSelect';
import NativeSelectOption from '@src/components/primitives/NativeSelect/NativeSelectOption';
import { formatDate } from '@src/lib/formatDate';

import type { ApplicationSubmissionListOut, Language } from '../../services/applicationService';

export interface ApplicationVersionBarProps {
  /** All application versions of the project (current flag on each row). */
  applications: ApplicationSubmissionListOut[];
  /** Id of the submission currently shown in the dialog. */
  currentId: number;
  /** Language the next submission is prepared in. */
  language: Language;
  /** Disables the controls while a submission is being prepared. */
  preparing: boolean;
  /** Called with the id of the version to switch to. */
  onSelect: (submissionId: number) => void;
  /** Called when the language of the next submission changes. */
  onLanguageChange: (language: Language) => void;
  /** Called to prepare an additional submission in the selected language. */
  onPrepareNew: () => void;
}

/** Bar to switch the reviewed application version and prepare a further one. */
export default function ApplicationVersionBar({
  applications,
  currentId,
  language,
  preparing,
  onSelect,
  onLanguageChange,
  onPrepareNew,
}: ApplicationVersionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {applications.length > 0 && (
        <NativeSelect
          size="sm"
          value={String(currentId)}
          onChange={(event) => onSelect(Number(event.target.value))}
          disabled={preparing}
          aria-label="Bewerbungsversion"
        >
          {applications.map((app) => (
            <NativeSelectOption key={app.id} value={String(app.id)}>
              {versionLabel(app)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      <NativeSelect
        size="sm"
        value={language}
        onChange={(event) => onLanguageChange(event.target.value as Language)}
        disabled={preparing}
        aria-label="Sprache der Bewerbung"
      >
        <NativeSelectOption value="de">Deutsch</NativeSelectOption>
        <NativeSelectOption value="en">English</NativeSelectOption>
      </NativeSelect>
      <Button variant="secondary" size="sm" disabled={preparing} onClick={onPrepareNew}>
        {preparing ? 'Wird vorbereitet …' : 'Weitere Bewerbung vorbereiten'}
      </Button>
    </div>
  );
}

/** Version option label: `DE · 21.09.2026 · 55 (aktuell)`. */
function versionLabel(app: ApplicationSubmissionListOut): string {
  const score = app.lastScore == null ? '–' : app.lastScore.toFixed(0);
  const current = app.isCurrent ? ' (aktuell)' : '';
  return `${app.language.toUpperCase()} · ${formatDate(app.createdAt)} · ${score}${current}`;
}
