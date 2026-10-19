/**
 * On-demand description merge streaming (SSE-ish text/plain stream).
 */
import { projectsBase } from './aiscopeEndpoints';

const SENTINEL_PATTERN = /\[\[LLM_ERROR:([^:]+):([\s\S]*?)\]\]/;

/** Metadata extracted from the SSE meta event. */
export interface CallLogMeta {
  call_log_id: number;
}

/**
 * Result of a description merge stream.
 */
export interface MergeStreamResult {
  /** The merged description text (error sentinel stripped). */
  text: string;
  /** Metadata about the underlying LLM call (null if meta event was not received). */
  callLogMeta: CallLogMeta | null;
}

/** Parses a stream line as a meta event; returns the meta or null when absent. */
function parseMetaLine(line: string): CallLogMeta | null {
  try {
    const parsed = JSON.parse(line) as { type: string; call_log_id: number };
    if (parsed.type === 'meta' && typeof parsed.call_log_id === 'number') {
      return { call_log_id: parsed.call_log_id };
    }
  } catch {
    // Not JSON – no meta.
  }
  return null;
}

/** Extracts the human-readable message from the error sentinel, or null if absent. */
function parseSentinel(text: string): string | null {
  const match = text.match(SENTINEL_PATTERN);
  if (!match) return null;
  const [, , message] = match;
  return message.trim() || 'Zusammenfassung fehlgeschlagen.';
}

/** Reads the plain-text/JSON detail from an error response, with a fallback. */
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return 'LLM-Konfiguration fehlgeschlagen.';
    try {
      const json = JSON.parse(text) as { detail?: string };
      return json.detail ?? text;
    } catch {
      return text;
    }
  } catch {
    return 'LLM-Konfiguration fehlgeschlagen.';
  }
}

/**
 * Streams an on-demand description merge for a master project via
 * POST /admin/fbf/projects/{id}/merge-description (text/plain stream).
 *
 * Invokes `onChunk` with the accumulated *visible* text after each received
 * chunk so the caller can render the summary live. The error sentinel
 * (`[[LLM_ERROR:<type>:<msg>]]`) is stripped from the visible text and surfaced
 * as a thrown Error; an HTTP 503 before the stream is thrown the same way so the
 * caller can show a clear error message.
 *
 * Returns a {@link MergeStreamResult} with the final text and optional call-log
 * metadata extracted from the first JSON meta chunk (if present).
 *
 * @throws Error on HTTP 503 (resolution failure) or a provider error sentinel
 *   during the stream.
 */
export async function streamDescriptionMerge(
  id: number,
  onChunk: (accumulated: string) => void,
): Promise<MergeStreamResult> {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1${projectsBase}/${id}/merge-description`,
    { method: 'POST', credentials: 'include' },
  );
  if (res.status === 503) {
    const detail = await readErrorDetail(res);
    throw new Error(detail);
  }
  if (!res.ok || !res.body) {
    throw new Error(`Merge fehlgeschlagen (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let callLogMeta: CallLogMeta | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });

    // Detect meta event: first line JSON → extract call_log_id.
    if (callLogMeta === null && raw.includes('\n')) {
      const firstLine = raw.split('\n')[0];
      const meta = parseMetaLine(firstLine);
      if (meta !== null) {
        callLogMeta = meta;
        // Remove the meta line from the visible text.
        raw = raw.substring(firstLine.length + 1);
      }
    }

    onChunk(stripSentinel(raw));
  }
  raw += decoder.decode();

  const sentinel = parseSentinel(raw);
  const visible = stripSentinel(raw);
  onChunk(visible);

  // Also try to detect meta at the end (edge case: meta is the only chunk).
  if (callLogMeta === null && visible.startsWith('{')) {
    callLogMeta = parseMetaLine(visible.split('\n')[0]);
  }

  if (sentinel) {
    throw new Error(sentinel);
  }
  return { text: visible, callLogMeta };
}

/** Removes the error sentinel from the visible stream text. */
function stripSentinel(text: string): string {
  return text.replace(SENTINEL_PATTERN, '').trimEnd();
}
