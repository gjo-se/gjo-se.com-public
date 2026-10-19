import Link from '@src/components/primitives/Link';
import Markdown from '@src/components/primitives/Markdown';
import Separator from '@src/components/primitives/Separator';
import Text from '@src/components/primitives/Text';


import { detailRowVariants, detailValueVariants } from './DetailShell.variants';
import { containerCls, headerStripCls } from './ProjectDetailView.constants';

import type { FieldColor } from './DetailShell.types';
import type { FieldEntry, TextField } from './ProjectFields.utils';

export interface DetailShellProps {
  title: string;
  backUrl: string;
  fields: FieldEntry[];
  description: string | null;
  extra: React.ReactNode;
}

export type { DetailShellVariants } from './DetailShell.variants';

/** Internal layout shell for project detail views with metadata table, description, and extra section. */
export default function DetailShell({ title, backUrl, fields, description, extra }: DetailShellProps) {

  return (
    <div className="mx-auto">
      <div className="mb-8">
        <Link to={backUrl} variant="muted" size="sm">
          ← Zurück zur Liste
        </Link>
        <div className="mt-2"><Text variant="h1">{title}</Text></div>
      </div>

      <section>
        <div className={containerCls}>
          <div className={headerStripCls}><Text as="span" size="xs" weight="medium" uppercase color="muted">Metadaten</Text></div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {fields.map((f) => (
              <div key={f.label} className={detailRowVariants()}>
                <Text as="label" size="xs" weight="medium" uppercase color="muted">{f.label}</Text>
                <div className={detailValueVariants()}>
                  {f.kind === 'badges'
                    ? (f.values?.length ? <Text as="span" size="sm">{f.values.join(', ')}</Text> : <Text as="span" size="sm" color="muted">–</Text>)
                    : f.label === 'URL' && f.value
                      ? <Link href={f.value} external size="sm">{f.value}</Link>
                      : <Text as="span" size="sm" color={fieldTextColor(f)}>{f.value ?? '–'}</Text>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {extra}

      <Separator spacing="my-6" />
      <section>
        <div className={containerCls}>
          <div className={headerStripCls}><Text as="span" size="xs" weight="medium" uppercase color="muted">Beschreibung</Text></div>
          <div className="p-6">
            {description ? (
              <Markdown>{description}</Markdown>
            ) : (
              <Text as="span" size="sm" color="muted">Keine Beschreibung vorhanden.</Text>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function fieldTextColor(f: TextField): FieldColor | undefined {
  if (f.warn) return 'error';
  if (f.chipVariant === 'success') return 'success';
  if (f.chipVariant === 'muted' || !f.value) return 'muted';
  return undefined;
}
