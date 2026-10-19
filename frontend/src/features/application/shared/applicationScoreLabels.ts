/**
 * Application-Score Labels – deutsche Text-SSOT für die Score-Admin-UI.
 *
 * Reine Konstanten ohne React-Abhängigkeit: Kriterien-Labels, Gruppen- und
 * Verdict-Texte sowie die Kanon-Reihenfolge der Kriterien. Die Texte spiegeln
 * den fixen Rubric-Kanon (backend `application_score_rubric.SCORE_CRITERIA`,
 * weights_version="v1").
 */
import type { ScoreVerdict } from '../services/applicationScoreService';

/**
 * Anzeige-Reihenfolge der Kriterien in der Score-Admin-UI.
 *
 * Weicht bewusst von der Backend-Kanon-Reihenfolge ab: die K.o.-Dimensionen
 * `remote_match`, `contract_match`, `start_match` und `rate_match` stehen zuerst
 * (links neben den Skills bzw. ganz oben im Detail-Dialog; `start_match` direkt
 * rechts neben `contract_match`, `rate_match` direkt rechts neben `start_match`
 * – im Detail-Dialog damit direkt unter `start_match`).
 * Das API-Payload (`criteria[]`) bleibt in Kanon-Reihenfolge.
 */
export const CRITERION_ORDER: string[] = [
  'remote_match',
  'contract_match',
  'start_match',
  'rate_match',
  'must_skills',
  'semantic_fit',
  'domain_fit',
  'seniority_fit',
  'proof_evidence',
  'ats_format',
  'language_match',
];

/** Deutsche Labels der 11 Kanon-Kriterien. */
export const CRITERION_LABELS: Record<string, string> = {
  must_skills: 'Muss-Skills der Ausschreibung im CV',
  semantic_fit: 'Semantische Gesamtpassung Ausschreibung ↔ Paket',
  domain_fit: 'Domäne/Branche',
  seniority_fit: 'Seniorität/Rollenfit',
  proof_evidence: 'Belegte Outcomes/Zahlen im Paket',
  ats_format: 'ATS-Format/Vollständigkeit (Pflichtfelder, Parsebarkeit)',
  rate_match: 'Eigener Satz vs. Budget',
  start_match: 'Verfügbarkeit vs. geforderter Start',
  remote_match: 'Remote-Anteil',
  language_match: 'Antwortsprache = Ausschreibungssprache (EN↔EN)',
  contract_match: 'Einsatzform (freiberuflich/ANÜ)',
};

/** Kurzlabels der 11 Kanon-Kriterien für enge Tabellen-Header. */
export const CRITERION_SHORT_LABELS: Record<string, string> = {
  must_skills: 'Skills',
  semantic_fit: 'Sem',
  domain_fit: 'Domain',
  seniority_fit: 'Senior',
  proof_evidence: 'Proof',
  ats_format: 'ATS',
  rate_match: 'Rate',
  start_match: 'Start',
  remote_match: 'Remote',
  language_match: 'Lang',
  contract_match: 'Contract',
};

/** Deutsche Labels der 3 Kriteriums-Gruppen. */
export const GROUP_LABELS: Record<string, string> = {
  inhalt: 'Inhalt',
  form: 'Form',
  rahmen: 'Rahmen',
};

/** Deutsche Texte der 3 Verdikte. */
export const VERDICT_LABELS: Record<ScoreVerdict, string> = {
  ready: 'voraussichtlich maschinen-vorauswahl-fähig',
  borderline: 'grenzwertig (nachbessern)',
  weak: 'nicht vorauswahl-fähig',
};

/** Chip-Texte des Soll/Ist-Abgleichs der Anforderungen. */
export const REQUIREMENT_COVERAGE_LABELS = {
  missing: 'nicht im CV',
  covered: 'im CV',
} as const;

/** Kopfzeilen-Zähler „X von Y Muss-Anforderungen nicht im CV". */
export function requirementCoverageCounter(missing: number, total: number): string {
  return `${missing} von ${total} Muss-Anforderungen nicht im CV`;
}

/**
 * Art eines Kriteriums – `hard` = deterministische Regel, `content` = LLM-Bewertung.
 * Spiegelt `ScoreCriterion.kind` aus dem Backend-Kanon.
 */
export const CRITERION_KIND: Record<string, 'hard' | 'content'> = {
  must_skills: 'content',
  semantic_fit: 'content',
  domain_fit: 'content',
  seniority_fit: 'content',
  proof_evidence: 'content',
  ats_format: 'content',
  rate_match: 'hard',
  start_match: 'hard',
  remote_match: 'hard',
  language_match: 'hard',
  contract_match: 'hard',
};

/** Kurzformeln der 5 Hard-Fact-Kriterien (deterministisch, v1). */
export const HARD_FACT_FORMULAS: Record<string, string> = {
  rate_match:
    '1,0 wenn eigener Satz ≤ Budget · 0,7 bis +10 % · 0,4 bis +25 % · sonst 0,0 (Budget nur plausibel 20–250 €/h)',
  start_match:
    '1,0 wenn verfügbar ab ≤ gefordertem Start, sonst 0,0; Start-Quelle: my_start_date (manuell) → Ausschreibungstext → start_date · Ignore-Token (»-«) ⇒ Datenlücke',
  remote_match:
    'Geforderter Remote-Anteil aus Ausschreibungstext (Vorrang) bzw. project.remote_percent · remote → %/100 · onsite → (100−%)/100 · hybrid → 1,0',
  language_match: '1,0 wenn Mail-Sprache = Ausschreibungssprache (EN↔EN), sonst 0,0',
  contract_match:
    'Gelabelte Vertragsaussage im Text (Vorrang, negationssicher) bzw. contract_type · contracting → 1,0 · ANÜ/Festanstellung → 0,0 · sonst Datenlücke',
};

/** Methodik-Hinweise zur Score-Berechnung (Schwellen, LLM-Anteil, Sprache). */
export const METHODIK_NOTES: { thresholds: string; llm: string; language: string } = {
  thresholds: 'Schwellen: ready ≥ 85, borderline ≥ 70.',
  llm: 'Content-/Form-Kriterien = LLM-Bewertung (nicht reproduzierbar).',
  language: 'Sprache zählt nur über language_match.',
};

/** Liefert das deutsche Label eines Kriteriums oder den Key bei unbekannten Keys. */
export function criterionLabel(key: string): string {
  return CRITERION_LABELS[key] ?? key;
}
