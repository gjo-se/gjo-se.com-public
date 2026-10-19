/**
 * Tests: SkillGroupRadarModal.logic
 *
 * Prüft `buildSkillRadarSlides`: Der optionale Hero-Slide (Projekt- bzw. Promo-Auswahl)
 * führt als erster Slide (`MATCH_SLIDE_ID`), danach folgen alle nicht-leeren Gruppen
 * in `sort`-Reihenfolge. Ohne Hero-Skills bleiben nur die Gruppen-Slides.
 */
import { describe, expect, it } from 'vitest';

import { buildSkillRadarSlides, MATCH_SLIDE_ID } from '@src/components/organisms/SkillGroupRadarModal/SkillGroupRadarModal.logic';

import type { SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';
import type { SkillGroupOut } from '@src/features/fbf';

function group(id: number, label: string, sort: number): SkillGroupOut {
  return { id, sort, priority: 'high', label };
}

function skill(name: string): SkillGroupSkill {
  return { name, importance: 1, level_public: 5, tags: [] };
}

describe('buildSkillRadarSlides', () => {
  const groups = [group(2, 'Web', 1), group(1, 'AI', 0)];
  const byGroup: Record<number, SkillGroupSkill[]> = {
    1: [skill('GenAI')],
    2: [skill('React')],
  };

  it('stellt den Hero-Slide (id 0) den Gruppen-Slides voran', () => {
    const hero = [skill('Python'), skill('React')];

    const slides = buildSkillRadarSlides(hero, groups, byGroup);

    expect(slides[0]).toEqual({ id: MATCH_SLIDE_ID, skills: hero });
    expect(slides.map((s) => s.id)).toEqual([MATCH_SLIDE_ID, 1, 2]);
  });

  it('sortiert Gruppen-Slides nach sort ASC und überspringt leere Gruppen', () => {
    const slides = buildSkillRadarSlides(null, [...groups, group(3, 'Leer', 2)], byGroup);

    expect(slides.map((s) => s.label)).toEqual(['AI', 'Web']);
  });

  it('liefert ohne Hero-Skills ausschließlich die Gruppen-Slides', () => {
    const slides = buildSkillRadarSlides([], groups, byGroup);

    expect(slides.map((s) => s.id)).toEqual([1, 2]);
  });
});
