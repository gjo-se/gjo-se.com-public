/**
 * AdrEditor – Split-screen Markdown editor with live preview for ADRs.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ ← Zurück zur Liste    ◀ 0001 / 0025 ▶    │
 *   ├──────────────────────────────────────────┤
 *   │ Metadata: ID, Status, Date, Systems, Tags │
 *   ├────────────────────┬─────────────────────┤
 *   │ CodeMirror (50%)   │ Markdown (50%)      │
 *   │ (full raw text)    │ (content only)      │
 *   └────────────────────┴─────────────────────┘
 *
 * Route: /admin/viscera/adrs/:id
 */
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

import Link from '@src/components/primitives/Link/Link';
import Spinner from '@src/components/primitives/Spinner/Spinner';
import Text from '@src/components/primitives/Text/Text';
import { routeConfig } from '@src/router.config';

import { useWorkspace } from '../../../core/useWorkspace';
import { parseFrontmatter } from '../../../services/adrFileService';
import { useAdrFileLoader } from '../../hooks/useAdrFileLoader';
import { useAdrs } from '../../hooks/useAdrs';

import AdrMetadataPanel from './AdrMetadataPanel';
import AdrNavigation from './AdrNavigation';
import AdrSplitEditor from './AdrSplitEditor';

import type { Diagram } from '../../../core/workspaceSchema';

// ── Component ─────────────────────────────────────────────────────────────

/**
 * AdrEditor – split-screen markdown editor for a single ADR.
 */
export default function AdrEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, allIds, loading: adrsLoading } = useAdrs();
  const { workspace } = useWorkspace();

  // ── ADR data ──────────────────────────────────────────────────────────
  const adr = id ? getById(id) : undefined;
  const adrFilePath = adr?.filePath;

  const prevAdr = useMemo(() => {
    if (!id || !allIds.length) return null;
    const idx = allIds.indexOf(id);
    return idx > 0 ? allIds[idx - 1] : null;
  }, [id, allIds]);
  const nextAdr = useMemo(() => {
    if (!id || !allIds.length) return null;
    const idx = allIds.indexOf(id);
    return idx < allIds.length - 1 ? allIds[idx + 1] : null;
  }, [id, allIds]);

  // ── Raw markdown (fetched from filePath for editor) ────────────────────
  const { rawText, loading: fetchLoading, error: fetchError } = useAdrFileLoader(adrFilePath);

  // For preview: content without frontmatter
  const previewContent = useMemo(() => {
    if (!rawText) return '';
    const { content } = parseFrontmatter(rawText);
    return content;
  }, [rawText]);

  // ── Navigation ─────────────────────────────────────────────────────────

  const handlePrev = useCallback(() => {
    if (prevAdr) {
      navigate(routeConfig.adminVisceraAdrDetail.path.replace(':id', prevAdr));
    }
  }, [navigate, prevAdr]);

  const handleNext = useCallback(() => {
    if (nextAdr) {
      navigate(routeConfig.adminVisceraAdrDetail.path.replace(':id', nextAdr));
    }
  }, [navigate, nextAdr]);

  // ── Loading / Error states ──────────────────────────────────────────────

  const loading = adrsLoading || fetchLoading;

  if (loading && !adr) {
    return (
      <div className="flex justify-center py-20">
        <Spinner fullWidth />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mx-auto py-8">
        <Text color="error" size="md">
          Fehler beim Laden der ADR: {fetchError}
        </Text>
        <div className="mt-4">
          <Link to={routeConfig.adminVisceraAdrs.path} variant="muted" size="sm">
            ← Zurück zur Liste
          </Link>
        </div>
      </div>
    );
  }

  if (!adr && !loading) {
    return (
      <div className="mx-auto py-8">
        <Text color="muted" size="md">
          ADR &quot;{id ?? '?'}&quot; nicht gefunden.
        </Text>
        <div className="mt-4">
          <Link to={routeConfig.adminVisceraAdrs.path} variant="muted" size="sm">
            ← Zurück zur Liste
          </Link>
        </div>
      </div>
    );
  }

  if (!adr) {
    return null;
  }

  return (
    <div className="mx-auto flex flex-col gap-4">
      {/* ── Navigation bar ──────────────────────────────────────────── */}
      <AdrNavigation
        currentId={adr.idString}
        total={allIds.length}
        hasPrev={prevAdr !== null}
        hasNext={nextAdr !== null}
        onPrev={handlePrev}
        onNext={handleNext}
        backTo={routeConfig.adminVisceraAdrs.path}
      />

      {/* ── Metadata panel ──────────────────────────────────────────── */}
      <AdrMetadataPanel adr={adr} diagrams={(workspace?.diagrams ?? []) as Diagram[]} />

      {/* ── Split screen: Editor + Preview ──────────────────────────── */}
      <AdrSplitEditor rawText={rawText} previewContent={previewContent} />
    </div>
  );
}
