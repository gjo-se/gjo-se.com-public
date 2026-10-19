import { useCallback, useEffect, useMemo } from 'react';

import SkillFilter from '@src/components/molecules/SkillFilter/SkillFilter';
import Text from '@src/components/primitives/Text';
import Table, { TableFooter, TableRow, TableCell } from '@src/components/table';
import type { TableColumnProps } from '@src/components/table/TableColumn.interface';
import { useClientSideTable } from '@src/components/table/useClientSideTable';
import type { ImpactPoint } from '@src/lib/api/aiscope';

import { impactSummaryVariants } from './ImpactTable.variants';

interface ImpactTableProps {
  points: ImpactPoint[];
  loading: boolean;
  selectedSkills: string[];
  onSelectedSkillsChange: (skills: string[]) => void;
}

/** Lern-Ranking table of skills by impact, with client-side filtering. */
export type { ImpactTableVariants } from './ImpactTable.variants';

export default function ImpactTable({ points, loading, selectedSkills, onSelectedSkillsChange }: ImpactTableProps) {
  const filtered = useMemo(() => points.filter((p) => (p.level ?? 0) < 4), [points]);
  const currentMatch = filtered[0]?.current_match ?? 0;

  const allSkillNames = useMemo(() =>
    [...new Set(filtered.map((p) => p.skill_name))].sort(),
    [filtered],
  );

  const filteredBySkills = useMemo(() => {
    if (selectedSkills.length === 0) return filtered;
    return filtered.filter((p) => selectedSkills.includes(p.skill_name));
  }, [filtered, selectedSkills]);

  const loadFn = useCallback(async () => filteredBySkills, [filteredBySkills]);

  const table = useClientSideTable<ImpactPoint>({
    tableKey: 'skill-impact',
    loadFn,
    filterFn: (rows, q) => q
      ? rows.filter((r) => r.skill_name.toLowerCase().includes(q.toLowerCase()))
      : rows,
    sortFn: (rows, field, order) => {
      const key = field as keyof ImpactPoint;
      return [...rows].sort((a, b) => {
        const av = a[key] ?? 0;
        const bv = b[key] ?? 0;
        if (typeof av === 'string' && typeof bv === 'string') {
          return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return order === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
    },
    defaultSort: 'impact',
    defaultOrder: 'desc',
    autoLoad: false,
  });

  const { reload } = table;

  useEffect(() => {
    if (filteredBySkills.length > 0) reload();
  }, [filteredBySkills, reload]);

  const summary = useMemo(() => {
    const rows = table.data;
    const totalDelta = rows.reduce((sum, r) => sum + r.match_delta, 0);
    const totalImpact = rows.reduce((sum, r) => sum + r.impact, 0);
    const avgImportance = rows.length > 0
      ? rows.reduce((sum, r) => sum + r.blended_importance, 0) / rows.length
      : 0;
    const totalDeltaPct = currentMatch > 0 ? (totalDelta / currentMatch) * 100 : 0;
    return { totalDelta, totalImpact, avgImportance, totalDeltaPct, count: rows.length };
  }, [table.data, currentMatch]);

  const columns: Record<string, TableColumnProps> = useMemo(() => ({
    skill_name: { label: 'Skill', search: true, defaultSort: 'asc' },
    level: { label: 'Level', alignment: 'right', sortField: 'level' },
    blended_importance: { label: 'Importance', alignment: 'right', sortField: 'blended_importance' },
    match_delta: {
      label: 'Δ Stk', alignment: 'right', sortField: 'match_delta',
      renderCell: (row) => {
        const v = (row as unknown as ImpactPoint).match_delta;
        return `${v}`;
      },
    },
    delta_pct: {
      label: 'Δ %', alignment: 'right', sortable: false,
      renderCell: (row) => {
        const r = row as unknown as ImpactPoint;
        const pct = currentMatch > 0 ? (r.match_delta / currentMatch) * 100 : 0;
        return `${pct.toFixed(1)}%`;
      },
    },
    impact: {
      label: 'Impact', alignment: 'right', defaultSort: 'desc',
      renderCell: (row) => {
        const v = (row as unknown as ImpactPoint).impact;
        return `${Math.round(v)}`;
      },
    },
  }), [currentMatch]);

  if (loading) return <Text color="muted">Lädt…</Text>;
  if (filtered.length === 0) return <Text color="muted">Keine Skills mit Lernbedarf.</Text>;

  return (
    <>
      <div className={impactSummaryVariants()}>
        Aktuell: {currentMatch} Projekte (letzte 4 Wo.) mit ≥75% Match
      </div>
      <Table
        table={table}
        columns={columns}
        isLoading={loading}
        emptyMessage="Keine Skills mit Lernbedarf."
        footer={summary.count > 0 ? (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Gesamt (Seite)</TableCell>
              <TableCell alignment="right">Ø {summary.avgImportance.toFixed(1)}</TableCell>
              <TableCell alignment="right">{summary.totalDelta}</TableCell>
              <TableCell alignment="right">{summary.totalDeltaPct.toFixed(1)}%</TableCell>
              <TableCell alignment="right">{Math.round(summary.totalImpact)}</TableCell>
            </TableRow>
          </TableFooter>
        ) : undefined}
      >
        <SkillFilter
          allSkills={allSkillNames}
          selectedSkills={selectedSkills}
          onChange={onSelectedSkillsChange}
          placeholder="Skills filtern…"
        />
      </Table>
    </>
  );
}
