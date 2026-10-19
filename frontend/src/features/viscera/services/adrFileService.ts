/**
 * adrFileService – ADR-Datei-I/O gekapselt (fetch, parse, validate).
 *
 * Trennt HTTP-Zugriffe und Frontmatter-Parsing von React-Hooks/Komponenten.
 * Entspricht viewer-Pattern: API-Calls via Services.
 */

import * as yaml from 'js-yaml';

import { adrFrontmatterSchema } from '../core/workspaceSchema';

import type { AdrFrontmatter } from '../core/workspaceSchema';

// ── Types ─────────────────────────────────────────────────────────────────

/** Vollstaendiges ADR-Objekt: Frontmatter + Content + Quell-Pfad. */
export interface Adr extends AdrFrontmatter {
  /** Sortierbare ID als String (z.B. "0001"). */
  idString: string;
  /** Markdown-Body ohne Frontmatter. */
  content: string;
  /** HTTP-Pfad zur Quelldatei (z.B. "/architecture/adr/0001-foo.md"). */
  filePath: string;
}

/** Ergebnis des Frontmatter-Parsings. */
interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Extrahiert die sortierbare ID aus dem Dateinamen (z.B. "0001" aus "0001-foo.md"). */
function extractIdString(filePath: string): string {
  const filename = filePath.split('/').pop() ?? '';
  const match = filename.match(/^(\d+)/);
  return match ? match[1] : filename.replace(/\.md$/, '');
}

/**
 * Laedt rohen Markdown-Text einer ADR-Datei (fuer den Editor).
 * Wirft bei HTTP-Fehler eine Exception mit Status-Info.
 */
export async function fetchAdrContent(filePath: string): Promise<string> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}

// ── Fetch ─────────────────────────────────────────────────────────────────

/** Laedt und parst eine einzelne ADR-Datei per HTTP. */
export async function fetchAdrFile(filePath: string): Promise<Adr | null> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) return null;
    const raw = await response.text();
    const { data, content } = parseFrontmatter(raw);

    const result = adrFrontmatterSchema.safeParse(data);
    if (!result.success) {
      console.warn(
        `[adrFileService] Frontmatter-Validierung fehlgeschlagen fuer ${filePath}:`,
        result.error.message,
      );
      return null;
    }

    return {
      ...result.data,
      idString: extractIdString(filePath),
      content,
      filePath,
    };
  } catch {
    return null;
  }
}

/**
 * Parst YAML-Frontmatter aus einem Markdown-String.
 * Erwartet das Format:
 *   ---
 *   key: value
 *   ---
 *   # Markdown body
 *
 * Wenn kein Frontmatter vorhanden ist, wird der gesamte String als Content zurueckgegeben.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const FM_DELIMITER = '---';
  const lines = raw.split('\n');

  if (lines[0]?.trim() !== FM_DELIMITER) {
    return { data: {}, content: raw };
  }

  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === FM_DELIMITER);
  if (endIndex === -1) {
    return { data: {}, content: raw };
  }

  const yamlBlock = lines.slice(1, endIndex).join('\n');
  const content = lines.slice(endIndex + 1).join('\n').replace(/^\n+/, '');

  try {
    const data = yaml.load(yamlBlock) as Record<string, unknown>;
    return { data: data ?? {}, content };
  } catch {
    return { data: {}, content };
  }
}
