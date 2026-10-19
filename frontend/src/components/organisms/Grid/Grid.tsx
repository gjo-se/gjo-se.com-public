import { type ComponentType,useMemo, useState } from 'react';

import Chip from '@src/components/primitives/Chip';
import LoadingShell from '@src/components/primitives/LoadingShell';

import ErrorState from '../../molecules/ErrorState/ErrorState';
import PageHeader from '../../molecules/PageHeader/PageHeader';

export interface GridProps<T> {
  title?: string
  subtitle?: string
  items: T[]
  Component: ComponentType<{ item: T }>
  getKey?: (item: T) => React.Key
  getTags?: (item: T) => string[] | undefined
  filters?: string[]
  loading?: boolean
  errorMessage?: string
}
/**
 * Grid – Generisches, filterbares Grid für beliebige Item-Komponenten.
 * Filter werden auto-deriviert wenn nicht explizit gesetzt.
 * Rendert Spinner bei `loading`, ErrorState bei `errorMessage`.
 *
 * @example
 * <Grid title="Portfolio" subtitle="Meine Projekte" items={projects}
 *       Component={ProjectCard} getKey={p => p.title} getTags={p => p.tags} />
 * <Grid loading items={[]} Component={Card} />
 * <Grid errorMessage="Laden fehlgeschlagen" items={[]} Component={Card} />
 */
export default function Grid<T>({
  title,
  subtitle,
  items,
  Component,
  getKey,
  getTags,
  filters,
  loading,
  errorMessage,
}: GridProps<T>) {
  const resolveKey = getKey ?? ((item: T) => {
    const r = item as Record<string, unknown>;
    return String(r.title ?? r.name ?? r.id ?? '');
  });
  const toKey = (item: T) => String(resolveKey(item));
  const resolveTags = useMemo(
    () => getTags ?? ((item: T) => (item as Record<string, unknown>).tags as string[] | undefined),
    [getTags],
  );

  const derivedFilters = useMemo(
    () => filters ?? [...new Set(items.flatMap(item => resolveTags(item) ?? []))].sort(),
    [items, filters, resolveTags],
  );
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? items.filter(item => resolveTags(item)?.includes(active)) : items;

  if (loading) return <LoadingShell />;
  if (errorMessage) return <ErrorState code="500" title="Ladefehler" description={errorMessage} />;

  return (
    <section>
      {title && <PageHeader title={title} subtitle={subtitle} />}
      {derivedFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {derivedFilters.map(f => (
            <Chip key={f} selected={active === f} onClick={() => setActive(a => a === f ? null : f)}>{f}</Chip>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(item => <Component key={toKey(item)} item={item} />)}
      </div>
    </section>
  );
}
