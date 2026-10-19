/**
 * ApplicationTimeline – list of an application's communication log.
 *
 * Renders the `ApplicationCommunicationOut` entries as date + type/direction
 * chips, subject, a summary snippet, outcome/sentiment/follow-up badges and
 * tags (newest first). Optional `onEntryClick` makes each entry clickable
 * (e.g. to open the edit dialog); `systemEntryIds` marks auto-logged entries.
 * Pure presentation: no API access.
 */
import { containerCls, headerStripCls } from '@src/components/organisms/ProjectDetailView/ProjectDetailView.constants';
import Button from '@src/components/primitives/Button';
import Chip from '@src/components/primitives/Chip';
import Separator from '@src/components/primitives/Separator';
import Text from '@src/components/primitives/Text';
import { formatDate } from '@src/lib/formatDate';

import type { ApplicationCommunicationOut } from '../../services/applicationService';

export interface ApplicationTimelineProps {
  communications: ApplicationCommunicationOut[];
  title?: string;
  emptyText?: string;
  /** When given, each entry becomes clickable (e.g. to open an edit dialog). */
  onEntryClick?: (entry: ApplicationCommunicationOut) => void;
  /** Ids of entries logged automatically (e.g. the send record). */
  systemEntryIds?: number[];
}

const TYPE_LABELS: Record<string, string> = {
  note: 'Notiz',
  call: 'Anruf',
  email: 'E-Mail',
  meeting: 'Meeting',
};

const DIRECTION_LABELS: Record<string, string> = {
  outbound: 'Ausgehend',
  inbound: 'Eingehend',
  internal: 'Intern',
};

const OUTCOME_LABELS: Record<string, string> = {
  positive: 'Positiv',
  neutral: 'Neutral',
  negative: 'Negativ',
  no_answer: 'Keine Antwort',
  follow_up_needed: 'Wiedervorlage nötig',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positiv',
  neutral: 'Neutral',
  negative: 'Negativ',
};

/**
 * Card that lists the communication history of an application submission.
 */
export default function ApplicationTimeline({
  communications,
  title = 'Verlauf',
  emptyText = 'Noch kein Verlauf',
  onEntryClick,
  systemEntryIds = [],
}: ApplicationTimelineProps) {
  const sorted = [...communications].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className={containerCls}>
      <div className={headerStripCls}>
        <Text as="h3" variant="h6">
          {title}
        </Text>
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 py-3">
          <Text as="span" size="sm" color="muted">
            {emptyText}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((entry, index) => {
            const isSystem = systemEntryIds.includes(entry.id);
            const showSummary = entry.summary !== null && entry.summary !== entry.subject;
            const body = (
              <div className="flex flex-col gap-1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Text as="span" size="xs" color="muted">
                    {formatDate(entry.date)}
                  </Text>
                  <Chip variant="muted" size="sm">
                    {TYPE_LABELS[entry.type] ?? entry.type}
                  </Chip>
                  <Chip variant="outline" size="sm">
                    {DIRECTION_LABELS[entry.direction] ?? entry.direction}
                  </Chip>
                  {isSystem && (
                    <Chip variant="info" size="sm">
                      automatisch
                    </Chip>
                  )}
                  {entry.outcome && (
                    <Chip variant="muted" size="sm">
                      {OUTCOME_LABELS[entry.outcome] ?? entry.outcome}
                    </Chip>
                  )}
                  {entry.sentiment && (
                    <Chip variant="muted" size="sm">
                      {SENTIMENT_LABELS[entry.sentiment] ?? entry.sentiment}
                    </Chip>
                  )}
                  {entry.followUpDate && (
                    <Chip variant="warning" size="sm">
                      {entry.followUpDone
                        ? 'WV erledigt'
                        : `WV ${formatDate(entry.followUpDate)}`}
                    </Chip>
                  )}
                </div>

                {entry.subject && (
                  <Text as="span" size="sm" weight="medium">
                    {entry.subject}
                  </Text>
                )}

                {showSummary && (
                  <Text
                    as="span"
                    size="sm"
                    color={entry.subject ? 'muted' : undefined}
                    lineClamp={2}
                  >
                    {entry.summary}
                  </Text>
                )}

                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Chip key={tag.id} variant="outline" size="sm">
                        {tag.name}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <div key={entry.id}>
                {index > 0 && <Separator />}
                {onEntryClick ? (
                  <Button
                    type="button"
                    variant="menu"
                    size="none"
                    onClick={() => onEntryClick(entry)}
                    aria-label="Eintrag bearbeiten"
                  >
                    {body}
                  </Button>
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
