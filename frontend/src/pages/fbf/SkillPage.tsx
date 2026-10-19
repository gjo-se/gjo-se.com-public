import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';

import ErrorState from '@src/components/molecules/ErrorState/ErrorState';
import SkillCategoryNav from '@src/components/molecules/SkillCategoryNav/SkillCategoryNav';
import { toGroupAnchorId } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.logic';
import SkillGroupGrid from '@src/components/organisms/SkillGroupGrid/SkillGroupGrid';
import SkillGroupHero from '@src/components/organisms/SkillGroupHero/SkillGroupHero';
import SkillGroupRadarModal from '@src/components/organisms/SkillGroupRadarModal/SkillGroupRadarModal';
import { buildSkillRadarSlides, MATCH_SLIDE_ID } from '@src/components/organisms/SkillGroupRadarModal/SkillGroupRadarModal.logic';
import Skeleton from '@src/components/primitives/Skeleton';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { useProjectSkills, useProofStore, useSkillList, useSkillGroups, type SkillPublicOut } from '@src/features/fbf';
import { useContent } from '@src/providers/siteContent/useContent';
import { useStateTexts } from '@src/providers/siteContent/useStateTexts';
import { routeConfig } from '@src/router.config';

/** Tag der kuratierten Hero-Auswahl ohne Projekt – die wichtigsten Skills quer über die Top-Gruppen. */
const PROMO_TAG = 'site:promo';

/**
 * Obergrenze einer gültigen Projekt-ID: PostgreSQL-``integer`` (int32). Längere
 * Zahlen werden gar nicht erst angefragt (FastAPI/DB würde 4xx/5xx liefern) –
 * so landet ein kaputter Mail-Link sofort und ohne Fehler-Flash auf `/skills`.
 */
const PROJECT_ID_MAX = 2_147_483_647;

/** Ladegerüst-Karten (stabile IDs + Spalten-Spanne) – spiegelt den 6-spaltigen Aufbau der Gruppen-Karten. */
const SKILL_GRID_SKELETON = [
  { id: 'wide', span: 'sm:col-span-6' },
  { id: 'half-left', span: 'sm:col-span-3' },
  { id: 'half-right', span: 'sm:col-span-3' },
  { id: 'third-left', span: 'sm:col-span-2' },
  { id: 'third-center', span: 'sm:col-span-2' },
  { id: 'third-right', span: 'sm:col-span-2' },
] as const;

/** Skills-Seite radar-zentriert: Gruppen-Sektionen (Top-7-Karten) + Lightbox, Texte via Content-Keys. */
export default function SkillPage() {
  const { projectId } = useParams();
  const { pathname } = useLocation();
  // Nur rein numerische IDs im PostgreSQL-integer-Bereich (int32) sind gültige
  // Proof-URLs. Text, negative oder überlange Zahlen (z. B. aus einem versandten
  // CV-Mail-Link) gelten als ungültig → sofortiger Fallback auf die Basis-Seite.
  const isValidProofId =
    projectId !== undefined &&
    /^\d+$/.test(projectId) &&
    Number(projectId) >= 1 &&
    Number(projectId) <= PROJECT_ID_MAX;
  const proofId = isValidProofId ? Number(projectId) : 0;
  const proofMode = isValidProofId;
  const invalidSlug = projectId !== undefined && !proofMode;

  const { items, loading, error, refetch } = useSkillList();
  const { groups, loading: groupsLoading, error: groupsError, refetch: refetchGroups } = useSkillGroups();
  const proof = useProjectSkills(proofId);
  // Ungültige oder unbekannte Projekt-ID → sofort auf die Basis-Skills-Seite (kein 500er).
  const redirectToSkills = invalidSlug || (proofMode && proof.isNotFound);
  const { lang } = useLanguage();
  const { data: content } = useContent(lang);
  const texts = useStateTexts();
  const setProjectId = useProofStore((s) => s.setProjectId);
  const clearProof = useProofStore((s) => s.clearProof);

  // Eine geteilte Lightbox auf Page-Ebene: `openSlideId` steuert den sichtbaren Carousel-Slide.
  // Hero und Grid feuern nur noch `onOpenSlide` – kein duplizierter Lightbox-Code mehr.
  const [openSlideId, setOpenSlideId] = useState<number | null>(null);
  // Aktive Gruppe: Chip in der Seitennavi + zugehörige Karte im Grid werden hervorgehoben.
  // Gesetzt per Chip-Klick (Option B – zuverlässig auch für Karten, die nicht bis ganz oben
  // scrollbar sind) und zusätzlich automatisch für eindeutige (vollbreite) Karten.
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  // Nach einem Chip-Klick wird die Auto-Hervorhebung kurz gesperrt, damit sie die eben
  // per Klick markierte Karte (z. B. rechte Karte einer Zweier-Reihe) nicht sofort ersetzt.
  const suppressAutoUntil = useRef(0);

  // Public-Skills nach group_id gruppieren – SkillGroupGrid rendert pro Gruppe eine Karte.
  const skillsByGroup = useMemo(() => {
    const map: Record<number, SkillPublicOut[]> = {};
    items.forEach((skill) => {
      if (skill.group_id == null) return;
      (map[skill.group_id] ??= []).push(skill);
    });
    return map;
  }, [items]);

  // Kuratierte Hero-Skills ohne Projekt: die `site:promo`-Auswahl (wichtigste Skills quer
  // über die Top-Gruppen). Eine einzelne Gruppe könnte die Breite „über 100 Skills" nicht
  // belegen – die kuratierte Auswahl über die Disziplinen hinweg tut es. Im Proof-Modus
  // speist stattdessen das Projekt den Hero-Radar.
  const promoSkills = useMemo(
    () => items.filter((s) => s.tags.some((t: { name: string }) => t.name === PROMO_TAG)),
    [items],
  );

  // Hero-Skills & Lightbox-Ziel: Beide Routen liefern exakt dieselbe Seite – der einzige
  // Unterschied ist die Datenquelle des Hero-Radars (Promo auf `/skills`, Projekt auf `/skills/<id>`).
  const heroSkills = useMemo(
    () => (proofMode ? proof.skills : promoSkills),
    [proofMode, proof.skills, promoSkills],
  );
  // Hero-Slide ist in beiden Modi der reservierte Hero-Slide (id 0): Projekt- bzw. Promo-Skills.
  const heroOpenTarget = MATCH_SLIDE_ID;

  // Carousel-Slides: Der Hero-Slide führt (Projekt-Skills im Proof-Modus, sonst die kuratierte
  // Promo-Auswahl), danach alle Gruppen-Slides.
  const slides = useMemo(
    () => buildSkillRadarSlides(proofMode ? proof.skills : promoSkills, groups, skillsByGroup),
    [proofMode, proof.skills, promoSkills, groups, skillsByGroup],
  );

  // Route → Store: Proof-URL setzt den Session-Kontext.
  // Bewusst KEIN Clear beim Verlassen – der Kontext endet nur mit der Session
  // (Navigation verliert die Sektion nicht, Plan Schritt 4).
  useEffect(() => {
    if (proofMode) setProjectId(proofId);
  }, [proofMode, proofId, setProjectId]);

  // Ungültige oder unbekannte Projekt-ID → Session-Kontext aufräumen, damit interne
  // Nav-Links nicht auf die kaputte Projekt-URL zeigen. Das eigentliche Redirect
  // übernimmt das <Navigate> im Render (dort ohne 500-Flash).
  useEffect(() => {
    if (redirectToSkills) clearProof();
  }, [redirectToSkills, clearProof]);

  // Auto-Hervorhebung beim Scrollen: nur eindeutige Karten (eigene vertikale Position =
  // vollbreite high-Karten) sind mechanisch bis zur oberen Schwelle scrollbar und werden
  // automatisch aktiv. Mehrspaltige Reihen (medium/base) werden bewusst per Chip-Klick
  // markiert – dort ist eine eindeutige „aktuelle" Karte sonst nicht bestimmbar.
  //
  // Scroll-Offset & Schwelle sind dynamisch: Die sticky Seitennavi ist auf Mobil ggf.
  // mehrzeilig (und damit höher). Header- + Nav-Höhe werden gemessen und als CSS-Variable
  // `--skills-nav-offset` gesetzt, damit Karten beim Sprung nie unter der Navi verschwinden.
  useEffect(() => {
    const cards = [...groups]
      .sort((a, b) => a.sort - b.sort)
      .filter((g) => (skillsByGroup[g.id] ?? []).length > 0);

    let anchor = 140;
    const measure = () => {
      const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 64;
      const nav = document.querySelector('nav[aria-label="Skill-Kategorien"]');
      const navH = nav ? nav.getBoundingClientRect().height : 0;
      anchor = Math.round(headerH + navH);
      // + Puffer, damit der Kartentitel nicht direkt unter der Navi klebt.
      document.documentElement.style.setProperty('--skills-nav-offset', `${anchor + 12}px`);
    };

    let raf = 0;
    function update() {
      if (Date.now() < suppressAutoUntil.current) return;
      // Eindeutige Karten = die, deren (gerundete) vertikale Position nur einmal vorkommt.
      const tops = new Map<number, number[]>();
      const pos = new Map<number, number>();
      cards.forEach((group) => {
        const el = document.getElementById(toGroupAnchorId(group.label));
        if (!el) return;
        const top = Math.round(el.getBoundingClientRect().top);
        pos.set(group.id, top);
        const band = tops.get(top) ?? [];
        band.push(group.id);
        tops.set(top, band);
      });

      const vh = window.innerHeight;
      let candidate: number | null = null;
      let bestTop = Infinity;
      cards.forEach((group) => {
        const top = pos.get(group.id);
        if (top == null) return;
        // Nur eindeutige (vollbreite) Karten automatisch zuordnen.
        if ((tops.get(top)?.length ?? 0) !== 1) return;
        if (top >= anchor && top < vh && top < bestTop) {
          bestTop = top;
          candidate = group.id;
        }
      });
      setActiveGroupId(candidate);
    }

    function scheduleUpdate() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    measure();
    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    // Layout ändert sich (Resize / Navi-Zeilenumbruch): Offset neu messen + neu bewerten.
    const onLayout = () => {
      measure();
      scheduleUpdate();
    };
    window.addEventListener('resize', onLayout);
    let resizeObserver: ResizeObserver | null = null;
    const navEl = document.querySelector('nav[aria-label="Skill-Kategorien"]');
    if (navEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onLayout);
      resizeObserver.observe(navEl);
    }
    const settleTimer = window.setTimeout(measure, 150);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', onLayout);
      resizeObserver?.disconnect();
      window.clearTimeout(settleTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [groups, skillsByGroup]);

  // ── Ungültige/unbekannte Projekt-ID: sofortige Umleitung ──
  // Muss VOR den Proof-Loading-/Error-States stehen, damit ein unbekannter Slug
  // keinen 500-Flash zeigt, sondern direkt sprachbewusst auf `/skills` landet.
  if (redirectToSkills) {
    const prefix = pathname.startsWith('/en') ? '/en' : '';
    return <Navigate to={`${prefix}${routeConfig.fbfSkill.path}`} replace />;
  }

  // ── Proof-Modus: Laden / Fehler ──
  if (proofMode && proof.loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }
  if (proofMode && proof.error) {
    return (
      <ErrorState
        code="500"
        title={texts.errorTitle}
        description={texts.errorDescription}
        buttonLabel={texts.errorRetry}
        onButtonClick={proof.refetch}
      />
    );
  }

  // ── Gemeinsamer Zustand (Stack) ──
  if (loading || groupsLoading) {
    // Ladegerüst statt Vollbild-Spinner: die Seitenstruktur steht sofort, die
    // Daten füllen die Karten anschließend (deutlich kürzere wahrgenommene Ladezeit).
    return (
      <div className="py-section" role="status" aria-label={texts.loading}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-6 sm:gap-x-6 sm:gap-y-8">
          {SKILL_GRID_SKELETON.map((card) => (
            <div key={card.id} className={card.span}>
              <Skeleton height="11rem" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error || groupsError) {
    return (
      <ErrorState
        code="500"
        title={texts.errorTitle}
        description={texts.errorDescription}
        buttonLabel={texts.errorRetry}
        onButtonClick={() => { void refetch(); void refetchGroups(); }}
      />
    );
  }

  return (
    <div>
      {heroSkills.length > 0 && (
        <SkillGroupHero
          skills={heroSkills}
          openSlideTarget={heroOpenTarget}
          onOpenSlide={setOpenSlideId}
          title={content['skills.hero.title'] ?? 'Technologische Tiefe'}
          usp={content['skills.hero.usp'] ?? 'AI · Architektur · Clean Code'}
          subline={content['skills.hero.subline'] ?? 'Baue LLM-Infrastruktur, auf der Anwendungen stabil laufen.'}
        />
      )}

      {groups.length > 0 && (
        <SkillCategoryNav
          groups={groups}
          skillsByGroup={skillsByGroup}
          activeGroupId={activeGroupId}
          onSelect={(id) => {
            suppressAutoUntil.current = Date.now() + 900;
            setActiveGroupId(id);
          }}
        />
      )}

      {items.length === 0 ? (
        <Text size="sm" color="muted">
          {texts.empty}
        </Text>
      ) : (
        <SkillGroupGrid
          groups={groups}
          skillsByGroup={skillsByGroup}
          activeGroupId={activeGroupId}
          onOpenSlide={setOpenSlideId}
        />
      )}

      <SkillGroupRadarModal
        open={openSlideId != null}
        onOpenChange={(open) => { if (!open) setOpenSlideId(null); }}
        groups={slides}
        initialGroupId={openSlideId ?? 0}
      />
    </div>
  );
}
