import { useMemo } from 'react';

import { toCardData } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.logic';


import { useSkillGroups } from './useSkillGroups';
import { useSkillList } from './useSkillList';

import type { SkillPublicOut } from '../services/skills';

/** Eine Home-Teaser-Karte: Gruppe (H3) + Skill-Anzahl + Top-Skill-Badges. */
export interface HomeSkillGroupCard {
  /** Gruppen-ID (DB). */
  id: number
  /** Lokalisierter Gruppen-Name (H3), z. B. „AI". */
  title: string
  /** Anzahl öffentlicher Skills der Gruppe. */
  count: number
  /** Top-N Skill-Namen (kuratierte Reihenfolge, gleiche Logik wie die Skills-Seite). */
  badges: string[]
}

interface UseHomeSkillGroupsResult {
  cards: HomeSkillGroupCard[]
  loading: boolean
  error: boolean
}

/**
 * useHomeSkillGroups – speist den Home-Skills-Teaser aus den **ersten N Skill-Gruppen**
 * (nach `sort`, z. B. AI / Architecture / Clean Code). Gleiche Datenquelle (`useSkillGroups`
 * + `useSkillList`) und gleiche Top-N-Reihenfolge (`toCardData`) wie die Skills-Seite –
 * keine `site_content`-Pflege der Karteninhalte mehr.
 */
export function useHomeSkillGroups(limit = 3): UseHomeSkillGroupsResult {
  const { groups, loading: groupsLoading, error: groupsError } = useSkillGroups();
  const { items, loading: skillsLoading, error: skillsError } = useSkillList();

  const cards = useMemo<HomeSkillGroupCard[]>(() => {
    const byGroup = new Map<number, SkillPublicOut[]>();
    items.forEach((skill) => {
      if (skill.group_id == null) return;
      const list = byGroup.get(skill.group_id) ?? [];
      list.push(skill);
      byGroup.set(skill.group_id, list);
    });

    return [...groups]
      .sort((a, b) => a.sort - b.sort)
      .map((group) => ({ group, skills: byGroup.get(group.id) ?? [] }))
      .filter((entry) => entry.skills.length > 0)
      .slice(0, limit)
      .map((entry) => ({
        id: entry.group.id,
        title: entry.group.label,
        count: entry.skills.length,
        badges: toCardData(entry.skills).map((skill) => skill.name),
      }));
  }, [groups, items, limit]);

  return { cards, loading: groupsLoading || skillsLoading, error: groupsError || skillsError };
}
