/**
 * Portfolio-Feature-Typen für die public-FE.
 *
 * Abgeleitet aus den generierten OpenAPI-Typen (`lib/types.generated.ts`) und
 * als Feature-Public-API exportiert. Textfelder sind lokalisiert (requested
 * locale, Fallback Deutsch).
 */

import type { ReactNode } from 'react';

/** Detailansicht eines public-Portfolio-Projekts. */
export interface PortfolioDetail {
  slug: string;
  title: string;
  sub_title: string | null;
  impact_summary: string | null;
  /** Hero-/Teaser-Bild des Projekts (Storage-Key). */
  image: string | null;
  /** Optionaler Storage-Key der WebP-Variante von `image` (falls vorhanden). */
  webpKey?: string | null;
  year: string | null;
  link_url: string | null;
  link_label: string | null;
}

/** Listeneintrag der public-Portfolio-Liste. */
export interface PortfolioListItem {
  slug: string;
  title: string;
  sub_title: string | null;
  /** Kurzer, scannbarer Karten-Teaser (Home), getrennt vom langen `impact_summary`. */
  teaser: string | null;
  impact_summary: string | null;
  /** Eigentliches Projektbild (Storage-Key), unabhängig von Proof-Bildern. */
  image: string | null;
  /** Optionaler Storage-Key der WebP-Variante von `image` (falls vorhanden). */
  webpKey?: string | null;
  year: string | null;
}

/** Eine Phase der Kette – verlinkt auf die passende Portfolio-Detailseite. */
export interface ProjectChainPhase {
  /** Mono-Nummer der Phase (z. B. "01"). Struktur, kein Content-Key. */
  num: string;
  /** Titel der Phase (lokalisierter Content, z. B. "AI"). */
  title: ReactNode;
  /** Metapher der Phase (lokalisierter Content) – Eyebrow `01 · MOTOR`. */
  subTitle?: string;
  /** Kurzbeschreibung der Phase (lokalisierter Teaser). */
  description?: ReactNode;
  /** Slug des Ziel-Projekts (Daten-SSO gegen /focus-Liste). */
  slug: string;
}

/** Public-Proof (Statement + optionales Bild). */
export interface Proof {
  id: number;
  image_src: string | null;
  /** Optionaler Storage-Key der WebP-Variante von `image_src` (falls vorhanden). */
  webpKey?: string | null;
  /**
   * Optionales WebP-Varianten-Set (Width-Label → Storage-Key, z. B.
   * `{ "800": "…800.webp", "1280": …, "1920": … }`) aus dem Asset-Upload
   * (`AssetUploadOut.webpKeys`). Datengetrieben – ohne Set bleibt es beim
   * einfachen `webpKey` bzw. dem Original-`<img>`.
   */
  webpKeys?: Record<string, string> | null;
  statement: string | null;
  /** Kuratierte Priorität – `high` wird volle Breite dargestellt. */
  priority: ProofPriority;
  /** Lokalisierte Vertrauensfrage (persuasiver Kern), optional. */
  question: string | null;
}

/** Priorität eines Public-Proofs – steuert die A/B-Breite im Raster (high = volle Breite). */
type ProofPriority = 'high' | 'medium';
