/**
 * Tests: SkillMatchSection.logic
 *
 * Prüft die Match-Sortierung (sortMatchSkills): Must-Have (importance > 4) zuerst,
 * jeweils importance DESC, Tie-Break name ASC – spiegelt den API-Kontrakt (#2604).
 */
import { describe, expect, it } from 'vitest';

import { sortMatchSkills } from '@src/components/organisms/SkillMatchSection/SkillMatchSection.logic';

import type { MatchSkill } from '@src/components/organisms/SkillMatchSection/SkillMatchSection.types';

function skill(name: string, importance: number | null): MatchSkill {
  return { name, importance, level_public: 5 };
}

describe('sortMatchSkills', () => {
  it('sortiert Must-Have (importance > 4) zuerst', () => {
    const skills = [
      skill('Nice', 2),
      skill('Must', 5),
      skill('Mid', 3),
    ];

    const sorted = sortMatchSkills(skills);

    expect(sorted.map((s) => s.name)).toEqual(['Must', 'Mid', 'Nice']);
  });

  it('sortiert innerhalb der Kategorie nach importance DESC, Tie-Break name ASC', () => {
    const skills = [
      skill('B', 4),
      skill('A', 5),
      skill('C', 5),
    ];

    const sorted = sortMatchSkills(skills);

    expect(sorted.map((s) => s.name)).toEqual(['A', 'C', 'B']);
  });

  it('behandelt null importance als niedrigster Wert (NULLS LAST)', () => {
    const skills = [
      skill('Unknown', null),
      skill('Known', 1),
      skill('High', 4),
    ];

    const sorted = sortMatchSkills(skills);

    expect(sorted.map((s) => s.name)).toEqual(['High', 'Known', 'Unknown']);
  });

  it('liefert leere Liste unverändert', () => {
    expect(sortMatchSkills([])).toEqual([]);
  });
});
