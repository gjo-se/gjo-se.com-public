export interface AboutTeaserProps {
  /** Sektions-Eyebrow (lokalisiert, z.B. „// Über mich"). */
  eyebrow?: string;
  /** Vollständiger Name (aus Application Profile, SSOT). */
  name: string;
  /** Positionierungs-Headline (z.B. „Senior AI Architect · LLM-Plattform"). */
  role?: string;
  /** Porträtfoto (Stream-URL aus dem Application Profile). */
  photoUrl?: string | null;
  /** Kurzer Credibility-Hook (1. Story-Absatz oder Fokus) – Markdown erlaubt. */
  hook: string;
  /** Beschriftung des Links (lokalisiert, z.B. „Mehr über mich"). */
  ctaLabel: string;
  /** Ziel-Route (→ /about). */
  ctaHref: string;
}
