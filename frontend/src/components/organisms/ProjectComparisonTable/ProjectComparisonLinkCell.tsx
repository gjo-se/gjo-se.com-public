/**
 * Content of a single column's Verknüpfung cell (add-slave / change-master).
 */
import type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

import AddSlaveCombobox from '../../molecules/AddSlaveCombobox/AddSlaveCombobox';
import ChangeMasterCombobox from '../../molecules/ChangeMasterCombobox/ChangeMasterCombobox';

/** Props of a single Verknüpfung cell. */
export interface ProjectComparisonLinkCellProps {
  col: ComparisonColumn;
  canonicalProjectId?: number;
  onRefetch: () => void;
}

/** Renders the link/unlink control for one comparison column. */
export default function ProjectComparisonLinkCell({
  col,
  canonicalProjectId,
  onRefetch,
}: ProjectComparisonLinkCellProps) {
  if (col.canonical) {
    return (
      <div style={{ overflow: 'hidden', width: '100%' }}>
        {canonicalProjectId != null && (
          <AddSlaveCombobox
            canonicalProjectId={canonicalProjectId}
            onRefetch={onRefetch}
          />
        )}
      </div>
    );
  }
  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <ChangeMasterCombobox
        slaveProjectId={col.id}
        currentMasterId={canonicalProjectId ?? 0}
        onRefetch={onRefetch}
      />
    </div>
  );
}
