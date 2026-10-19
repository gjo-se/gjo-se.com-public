/**
 * AdrMetadataPanel – Metadata card for a single ADR.
 *
 * Pure presentational component (golden G5): props-only, no Store, no Context, no Service.
 * Receives all data via props: `{ adr: Adr; diagrams?: Diagram[] }`.
 */

import Card from '@src/components/primitives/Card/Card';
import Chip from '@src/components/primitives/Chip/Chip';
import Link from '@src/components/primitives/Link/Link';
import Text from '@src/components/primitives/Text/Text';
import { routeConfig } from '@src/router.config';

import AdrStatusBadge from './AdrStatusBadge';

import type { Diagram } from '../../../core/workspaceSchema';
import type { Adr } from '../../../services/adrFileService';


// ── Props ───────────────────────────────────────────────────────────────────

export interface AdrMetadataPanelProps {
  adr: Adr;
  diagrams?: Diagram[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Renders the ADR metadata card: ID, Status, Date, Systems, Tags, Diagrams.
 *
 * Conforms to G5 (pure presentational): no useVisceraStore, no useWorkspace, no services.
 */
export default function AdrMetadataPanel({ adr, diagrams }: AdrMetadataPanelProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* ID */}
        <div className="flex items-center gap-2">
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            ID
          </Text>
          <Chip variant="default" size="sm">{adr.idString}</Chip>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Status
          </Text>
          <AdrStatusBadge status={adr.status} />
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Date
          </Text>
          <Text as="span" size="sm">{adr.date}</Text>
        </div>

        {/* Systems */}
        <div className="flex items-center gap-2">
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Systems
          </Text>
          <div className="flex flex-wrap gap-1">
            {adr.systems.length > 0 ? (
              adr.systems.map((sys) => (
                <Chip key={sys} variant="outline" size="sm">{sys}</Chip>
              ))
            ) : (
              <Text as="span" size="sm" color="muted">–</Text>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2">
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Tags
          </Text>
          <div className="flex flex-wrap gap-1">
            {adr.tags.length > 0 ? (
              adr.tags.map((tag) => (
                <Chip key={tag} variant="ghost" size="sm">{tag}</Chip>
              ))
            ) : (
              <Text as="span" size="sm" color="muted">–</Text>
            )}
          </div>
        </div>

        {/* Diagrams – uses diagrams prop (not useWorkspace directly) */}
        <div className="flex items-center gap-2">
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Diagrams
          </Text>
          <div className="flex flex-wrap gap-1">
            {adr.diagrams.length > 0 ? (
              adr.diagrams.map((key) => {
                const name = resolveDiagramName(key, diagrams);
                return (
                  <Link key={key} to={`${routeConfig.adminViscera.path}?diagram=${key}`}>
                    <Chip variant="outline" size="sm">{name}</Chip>
                  </Link>
                );
              })
            ) : (
              <Text as="span" size="sm" color="muted">–</Text>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Resolves a diagram key to its display name via the workspace diagrams list.
 * Falls back to the raw key if no matching diagram is found.
 */
function resolveDiagramName(key: string, diagrams?: Diagram[]): string {
  return diagrams?.find((d) => d.key === key)?.name ?? key;
}
