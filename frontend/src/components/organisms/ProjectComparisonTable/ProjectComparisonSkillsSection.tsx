/**
 * Skills section of the ProjectComparisonTable – 3-column grid
 * (Must-Have / Nice-to-have / Archived) with the full-size radar and
 * archived-skill edit modals.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import NavButton from '@src/components/primitives/NavButton';
import Text from '@src/components/primitives/Text';
import { recalculateProjectScore, updateSkill } from '@src/lib/api/aiscope';
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

import { getRadarColorImportance } from '../../charts/ChartShell/ChartShell.utils';
import RadarChart from '../../charts/RadarChart/RadarChart';
import SkillRadar from '../../molecules/SkillRadar/SkillRadar';
import { filterArchived, filterMustHave, filterNiceToHave, toRadarData } from '../../molecules/SkillRadar/SkillRadar.logic';
import SkillRadarModal from '../../organisms/SkillRadarModal/SkillRadarModal';
import ArchivedSkillEditModal from '../ArchivedSkillEditModal/ArchivedSkillEditModal';
import { containerCls, headerStripCls } from '../ProjectDetailView/ProjectDetailView.constants';

import {
  pctArchivedRowVariants,
  pctFlipBackVariants,
  pctFlipVariants,
  pctPerspectiveVariants,
  pctRadarButtonVariants,
} from './ProjectComparisonTable.variants';

import type { SkillRadarItem } from '../../molecules/SkillRadar/SkillRadar.types';

/** Props of the skills section. */
export interface ProjectComparisonSkillsSectionProps {
  master: ComparisonColumn;
  canonicalProjectId?: number;
  onRefetch: () => void;
  onScoreChange?: (matchScore: number | null, confirmedScore: number | null, publicScore: number | null) => void;
}

/** Renders the Must-Have / Nice-to-have / Archived skill columns for the master. */
export default function ProjectComparisonSkillsSection({
  master,
  canonicalProjectId,
  onRefetch,
  onScoreChange,
}: ProjectComparisonSkillsSectionProps) {
  const [showArchivedList, setShowArchivedList] = useState(false);
  const [blacklistedSkillIds, setBlacklistedSkillIds] = useState<Set<number>>(new Set());
  const [confirmedSkillIds, setConfirmedSkillIds] = useState<Set<number>>(new Set());
  const [editingSkill, setEditingSkill] = useState<SkillRadarItem | null>(null);
  const [modalGroup, setModalGroup] = useState<{
    label: string; skills: SkillRadarItem[]; variant?: 'default' | 'archived';
  } | null>(null);

  const mustHave = filterMustHave(master.skills);
  const niceToHave = filterNiceToHave(master.skills);
  const archived = filterArchived(master.skills);

  async function handleBlacklist(skillId: number, skillName: string) {
    try {
      await updateSkill(skillId, { status: 'blacklisted', name: skillName });
      setBlacklistedSkillIds(prev => new Set(prev).add(skillId));
      toast.success(`"${skillName}" auf Blacklist gesetzt.`);
      if (canonicalProjectId) {
        const result = await recalculateProjectScore(canonicalProjectId);
        onScoreChange?.(result.match_score, result.confirmed_score, result.public_score);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(`Blacklist fehlgeschlagen: ${msg}`);
    }
  }

  return (
    <>
      <section className="pct-wrapper">
        <div className={containerCls}>
          <div className={headerStripCls}>
            <Text as="span" size="xs" weight="medium" uppercase color="muted">
              Skills ({master.skills.length})
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
            <SkillRadar
              label="Must‑Have"
              skills={mustHave}
              onClick={() => setModalGroup({ label: 'Must‑Have', skills: mustHave })}

            />
            <SkillRadar
              label="Nice‑to‑have"
              skills={niceToHave}
              onClick={() => setModalGroup({ label: 'Nice‑to‑have', skills: niceToHave })}
            />
            <div>
              {(() => {
                const visibleArchived = archived.filter(
                  (s) => !blacklistedSkillIds.has(s.id) && !confirmedSkillIds.has(s.id),
                );
                const showRadar = visibleArchived.length >= 3;
                return (
                  <>
                    <NavButton
                      variant="toggle"
                      onClick={() => setShowArchivedList(prev => !prev)}
                      label={(
                        <>
                          Archiviert ({visibleArchived.length})
                          <div className={`transition-transform duration-300 ${showArchivedList ? 'rotate-180' : ''}`}>
                            <Icon name="chevron-down" size="sm" />
                          </div>
                        </>
                      )}
                    />
                    {visibleArchived.length === 0 ? (
                      <Text as="span" size="xs" color="muted">–</Text>
                    ) : (
                      <div className={pctPerspectiveVariants()}>
                        <div
                          className={pctFlipVariants()}
                          style={{ transform: showArchivedList ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: showArchivedList ? '300px' : showRadar ? '120px' : undefined }}
                        >
                          {/* ── Front: Radar chart ── */}
                          <div className="absolute inset-0 [backface-visibility:hidden]">
                            {showRadar ? (
                              <div
                                className={pctRadarButtonVariants()}
                                onClick={() => setModalGroup({ label: 'Archiviert', skills: visibleArchived, variant: 'archived' })}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setModalGroup({ label: 'Archiviert', skills: visibleArchived, variant: 'archived' });
                                }}
                              >
                                <RadarChart
                                  data={toRadarData(visibleArchived)}
                                  maxValue={5}
                                  showLegend={false}
                                  showTooltip={false}
                                  radars={[
                                    { dataKey: 'effective_importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
                                  ]}
                                />
                              </div>
                            ) : (
                              <div className="divide-y divide-border">
                                {visibleArchived.map((s) => (
                                  <div key={s.id} className="py-0.5">
                                    <Text as="span" size="xs" color="muted">{s.name}</Text>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ── Back: Inline list with actions ── */}
                          <div className={pctFlipBackVariants()}>
                            <div className="divide-y divide-border">
                              {visibleArchived.map((s) => (
                                <div key={s.id} className={pctArchivedRowVariants()}>
                                  <NavButton
                                    variant="listItem"
                                    onClick={() => setEditingSkill(s)}
                                    label={s.name}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Auf Blacklist setzen"
                                    aria-label={`${s.name} auf Blacklist setzen`}
                                    onClick={() => handleBlacklist(s.id, s.name)}
                                  >
                                    <Icon name="x" size="sm" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Modal for full-size radar */}
      <SkillRadarModal
        open={modalGroup !== null}
        onOpenChange={(o) => { if (!o) setModalGroup(null); }}
        label={modalGroup?.label ?? ''}
        skills={modalGroup?.skills ?? []}
        variant={modalGroup?.variant}
      />

      {/* Modal for editing an archived skill */}
      <ArchivedSkillEditModal
        skill={editingSkill ?? { id: 0, name: '', effective_importance: null, level: null }}
        open={editingSkill !== null}
        onOpenChange={(o) => { if (!o) setEditingSkill(null); }}
        onSaved={() => {
          if (editingSkill) {
            setConfirmedSkillIds(prev => new Set(prev).add(editingSkill.id));
            if (canonicalProjectId) {
              recalculateProjectScore(canonicalProjectId).then(() => onRefetch());
            }
          }
        }}
      />
    </>
  );
}
