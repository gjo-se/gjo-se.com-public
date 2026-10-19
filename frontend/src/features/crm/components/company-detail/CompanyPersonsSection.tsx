/**
 * CompanyPersonsSection – Presentational list of the persons linked to a CRM company.
 *
 * Renders the persons block of the company detail page (header + rows) or an empty
 * state. Pure view – the parent owns data loading.
 */

import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import type { components } from '@src/lib/types.generated';
import { routeConfig } from '@src/router.config';

type CrmPerson = components['schemas']['PersonOut'];

const CONTAINER =
  'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none';

const HEADER =
  'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2';

const ROW =
  'grid grid-cols-[1fr_2fr] items-center gap-x-4 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50';

const DIVIDER = 'divide-y divide-gray-100 dark:divide-gray-800';

/** Props for the company persons section. */
export interface CompanyPersonsSectionProps {
  persons: CrmPerson[]
}

/** Renders the linked persons of a company as a key-value list. */
export default function CompanyPersonsSection({ persons }: CompanyPersonsSectionProps) {
  return (
    <section>
      <div className={CONTAINER}>
        <div className={HEADER}>
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Personen ({persons.length})
          </Text>
        </div>
        {persons.length === 0 ? (
          <div className="px-4 py-6">
            <Text size="sm" color="muted">Keine Personen verknüpft.</Text>
          </div>
        ) : (
          <div className={DIVIDER}>
            {persons.map((p) => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—';
              return (
                <div key={p.id} className={ROW}>
                  <Text as="label" size="xs" weight="medium" uppercase color="muted">Person</Text>
                  <div className="overflow-hidden flex items-center gap-2">
                    <Link to={routeConfig.adminCrmPersonDetail.path.replace(':id', String(p.id))} size="sm">
                      {name}
                    </Link>
                    {p.address?.city && (
                      <Text size="xs" color="muted" as="span">– {p.address.city}</Text>
                    )}
                    {p.confidence_score != null && (
                      <Text as="span" size="xs" color="muted" tabular>{p.confidence_score}%</Text>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
