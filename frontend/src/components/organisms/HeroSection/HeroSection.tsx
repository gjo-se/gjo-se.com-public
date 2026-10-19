import Image from '@src/components/primitives/Image';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';

import { BLEED } from './HeroSection.utils';
import {
  heroSectionHeadlineVariants,
  heroSectionInnerVariants,
  heroSectionSublineVariants,
} from './HeroSection.variants';

import type { ReactNode } from 'react';


export interface HeroSectionProps {
  /** Serif-Display-Headline (H1) – beantwortet „Was kann er" in < 2 s. */
  headline: ReactNode;
  /** Mono/Primary-USP-Zeile (z. B. „AI · Architektur · Clean Code"). */
  usp?: ReactNode;
  /** Lead-Subline unter der USP – erklärt die Headline und führt zur Aktion. */
  subline?: ReactNode;
  /** Label des einzigen Primary-CTA (→ Kontakt). */
  ctaLabel?: ReactNode;
  /** Ziel-Route des einzigen Primary-CTA. */
  ctaHref?: string;
  /** Dezenter Hinweistext neben dem CTA („… wenn’s brennt"). */
  ctaHint?: ReactNode;
  /** Stream-URL des dekorativen Architektur-Hintergrunds (optional, Subtile Opacity). */
  background?: string;
}

export type { HeroSectionVariants } from './HeroSection.variants';

/**
 * HeroSection – Home-Hero im Variante-E-Stil (Asymmetrische Typo + Bild-Hintergrund).
 *
 * Headline steht volle Content-Breite (16ch-Maß), USP/Subline gestaffelt und der
 * einzige Primary-CTA ist innerhalb des Subline-Maßes nach rechts verschoben. Als
 * dekorativer, ~12% transparenter Hintergrund liegt ein Architektur-Bild über die
 * volle Viewport-Breite (Full-Bleed-Breakout), das links von einem Surface-Gradient
 * für die Lesbarkeit überdeckt wird. Ohne `background` rendert der Hero den reinen
 * Text-Hero auf der Surface-Fläche (Gradient-Layer entfällt) – der Hero bleibt damit
 * robust ohne Bilddaten. Presentational – Inhalte kommen als lokalisierte `Content`-
 * Nodes vom Parent (DB-SSO).
 */
export default function HeroSection({
  headline,
  usp,
  subline,
  ctaLabel,
  ctaHref,
  ctaHint,
  background,
}: HeroSectionProps) {
  const hasBackground = Boolean(background);

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative flex min-h-hero items-center py-14 sm:py-16"
    >
      {hasBackground && (
        <>
          {/* Architektur-Bild als dekorativer Hintergrund: ~12% Opacity (≥1600px 18%), volle Breite.
              Echtes <Image>-Atom (statt CSS-Background): fetchpriority=high + eager +
              async, damit der Browser das LCP-Bild sofort nach Bekanntwerden der URL
              hoch priorisiert lädt statt in der Low-Priority-Queue zu hängen. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 opacity-12 3xl:opacity-18 ${BLEED}`}
          >
            <Image
              src={background}
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
              objectPosition="center 30%"
            />
          </div>
          {/* Gradient links für Lesbarkeit der Headline über dem Bild */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 ${BLEED}`}
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--color-surface) 0%, color-mix(in oklab, var(--color-surface) 80%, transparent) 40%, transparent 70%)',
            }}
          />
        </>
      )}

      <div className={heroSectionInnerVariants()}>
        <div className={heroSectionHeadlineVariants()}>
          <Text as="h1" id="home-hero-title" variant="display">
            {headline}
          </Text>
        </div>

        {usp && (
          <div className="mt-6">
            <Text as="p" variant="eyebrow-sm" weight="medium">
              {usp}
            </Text>
          </div>
        )}

        {subline && (
          <div className={heroSectionSublineVariants()}>
            <Text as="p" variant="subline">
              {subline}
            </Text>
          </div>
        )}

        {ctaLabel && ctaHref && (
          <div className="mt-10 flex items-center gap-3">
            <Link to={ctaHref} variant="sos" aria-label="SOS – wenn’s brennt">
              {ctaLabel}
            </Link>
            {ctaHint && (
              <Text as="span" variant="hint" color="secondary">
                {ctaHint}
              </Text>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
