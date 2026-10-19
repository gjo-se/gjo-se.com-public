/**
 * ApplicationHistory – list of a project's application versions (Bewerbungen).
 *
 * Renders the `ApplicationSubmissionListOut` entries as clickable rows (newest
 * first). Each row links to the submission detail page
 * (`/admin/application-submissions/:id`) and shows date, language, status,
 * score and – for the current version – an "Aktuell" marker plus the mail
 * subject. Pure presentation: no API access.
 */
import { cva } from 'class-variance-authority';

import { containerCls, headerStripCls } from '@src/components/organisms/ProjectDetailView/ProjectDetailView.constants';
import Chip from '@src/components/primitives/Chip';
import Link from '@src/components/primitives/Link';
import Separator from '@src/components/primitives/Separator';
import Text from '@src/components/primitives/Text';
import { formatDate } from '@src/lib/formatDate';
import { routeConfig } from '@src/router.config';

import type { ApplicationSubmissionListOut } from '../../services/applicationService';

export interface ApplicationHistoryProps {
  applications: ApplicationSubmissionListOut[];
  title?: string;
  emptyText?: string;
}

const rowVariants = cva('flex items-center gap-2 px-4 py-3 hover:bg-muted/50');

/** Card that lists all application versions of a project, each linking to its detail. */
export default function ApplicationHistory({
  applications,
  title = 'Bewerbungsverlauf',
  emptyText = 'Noch keine Bewerbung',
}: ApplicationHistoryProps) {
  const sorted = [...applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
          {sorted.map((app, index) => {
            const detailPath = routeConfig.adminApplicationSubmissionDetail.path.replace(
              ':id',
              String(app.id),
            );
            const score = app.lastScore == null ? null : Math.round(app.lastScore);

            return (
              <div key={app.id}>
                {index > 0 && <Separator />}
                <Link
                  to={detailPath}
                  variant="card"
                  aria-label={`Bewerbung ${String(app.id)} öffnen`}
                >
                  <div className={rowVariants()}>
                    <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        <Text as="span" size="xs" color="muted">
                          {formatDate(app.createdAt)}
                        </Text>
                        <Chip variant="muted" size="sm">
                          {app.language.toUpperCase()}
                        </Chip>
                        {app.status && (
                          <Chip variant="info" size="sm">
                            {app.status.name}
                          </Chip>
                        )}
                        {app.isCurrent && (
                          <Chip variant="outline" size="sm">
                            Aktuell
                          </Chip>
                        )}
                        {score != null && (
                          <Chip variant="outline" size="sm">
                            Score {score}
                          </Chip>
                        )}
                      </div>
                      <Text as="span" size="sm" weight="medium" lineClamp={1}>
                        {app.subject}
                      </Text>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
