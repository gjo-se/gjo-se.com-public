import { Fragment, useMemo } from 'react';

import { cn } from '@src/lib/utils';

import { listVariants } from './List.variants';

import type { ListProps } from './List.interface';

/**
 * List – Semantic list element (ul, ol, or dl) with style and layout variants.
 *
 * `items`/`definitions` sind der einfache Weg (Liste rendert die `<li>`/`<dt>`/`<dd>`),
 * `children` erlaubt komplexe, semantische Items (`li`/`dt`/`dd` – nicht im Atom-Mapping)
 * mit exakter Klassenkontrolle. Layout (Grid) läuft über die Varianten `columns`/
 * `columnsMd`/`gapX`/`gapY` – so bleibt das semantische Element der Raster-Container,
 * ohne `className` an das Atom.
 */
export default function List({
  as: As = 'ul',
  listStyle = 'default',
  spacing = 'default',
  columns,
  columnsMd,
  gapX,
  gapY,
  items,
  definitions,
  children,
}: ListProps) {
  const layout = { columns, columnsMd, gapX, gapY };
  const keyed = useMemo(() => items?.map((item, i) => [String(i), item] as const) ?? [], [items]);

  if (As === 'dl') {
    const defs = definitions ?? [];
    return (
      <dl className={cn(listVariants({ spacing, ...layout }), 'text-on-surface-secondary')}>
        {children ??
          defs.map(({ dt, dd }) => (
            <Fragment key={dt}>
              <dt className="text-sm font-medium text-on-surface-subtle">{dt}</dt>
              <dd className="text-sm text-on-surface mt-0.5">{dd}</dd>
            </Fragment>
          ))}
      </dl>
    );
  }

  return (
    <As className={cn(listVariants({ listStyle, spacing, ...layout }))}>
      {children ?? keyed.map(([key, item]) => <li key={key}>{item}</li>)}
    </As>
  );
}
