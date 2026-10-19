import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';

import { homeSkillsBadgeVariants, homeSkillsCtaVariants } from './HomeSkillsTeaser.variants';

import type { HomeSkillsTeaserProps } from './HomeSkillsTeaser.interface';

/**
 * HomeSkillsTeaser – kuratierter Skills-Teaser der Homepage im Dummy-C-Format.
 *
 * Sektionstitel (`//`-Eyebrow + H2) über den Kompetenz-Karten (`<article>`, NICHT
 * klickbar – Icon/H3 + Skill-Count/Badges). Die Karten sind datengetrieben aus den
 * Top-Skill-Gruppen (AI / Architecture / Clean Code); Titel = Gruppenname, Count =
 * Anzahl Skills, Badges = Top-N Skill-Namen. Einziger Navigations-Link ist der
 * zentrierte „Alle Skills"-CTA (`Link variant="cta"`, persistenter Pfeil) → `/skills`.
 * KEIN Radar, kein
 * DB-Skill-Zugriff im Component; KEIN Beschreibungstext (die Chips tragen die Aussage).
 * Scroll-Reveal einmalig.
 */
export default function HomeSkillsTeaser({
  eyebrow,
  heading,
  cards,
  ctaLabel,
  ctaHref,
}: HomeSkillsTeaserProps) {
  return (
    <section
      className="reveal py-section"
      aria-labelledby="skills-title"
    >
      <div className="mb-12 flex items-baseline gap-4">
        {eyebrow && (
          <div className="shrink-0">
            <Text as="span" variant="eyebrow">
              {eyebrow}
            </Text>
          </div>
        )}
        <Text as="h2" id="skills-title" variant="title">
          {heading}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-stretch">
        {cards.filter((card) => card.title).map((card) => (
          <article
            key={card.title}
            className="flex flex-col gap-4 rounded-lg border border-border-light bg-surface-container p-8 shadow-sm"
          >
            {/* Hex/Radar-Icon (Dummy C, variante-c.html Z.523–534) – auf allen Karten identisch */}
            <svg
              className="h-10 w-10 text-primary"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g stroke="currentColor" strokeWidth="1.5">
                <polygon points="30,20 27,33 13,33 10,20 13,7 27,7" fill="currentColor" fillOpacity="0.12" />
                <line x1="20" y1="20" x2="33" y2="20" />
                <line x1="20" y1="20" x2="28" y2="34" />
                <line x1="20" y1="20" x2="12" y2="34" />
                <line x1="20" y1="20" x2="7" y2="20" />
                <line x1="20" y1="20" x2="12" y2="6" />
                <line x1="20" y1="20" x2="28" y2="6" />
              </g>
              <circle cx="20" cy="20" r="3" fill="currentColor" />
            </svg>
            <div className="flex items-baseline justify-between gap-4">
              <Text as="h3" variant="subtitle" weight="semibold">
                {card.title}
              </Text>
              <Text as="span" variant="meta" size="xs" color="secondary">
                {card.count} Skills
              </Text>
            </div>
            {card.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.badges.map((badge) => (
                  <div
                    key={badge}
                    className={homeSkillsBadgeVariants()}
                  >
                    <Text as="span" variant="meta" size="xs" color="default">
                      {badge}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className={homeSkillsCtaVariants()}>
        <Link to={ctaHref} variant="cta">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export type { HomeSkillsTeaserVariants } from './HomeSkillsTeaser.variants';
export type { HomeSkillsTeaserProps } from './HomeSkillsTeaser.interface';
