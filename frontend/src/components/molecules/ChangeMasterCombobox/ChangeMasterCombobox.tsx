/**
 * ChangeMasterCombobox – Master eines Slave-Projekts ändern.
 *
 * Dünner Wrapper um die `ProjectCombobox` (debounced Suche, Bestätigungs-Dialog).
 */
import ProjectCombobox from '@src/components/molecules/ProjectCombobox/ProjectCombobox';
import {
  fetchMasterCandidates,
  setProjectCanonical,
} from '@src/lib/api/aiscope';

export interface ChangeMasterComboboxProps {
  slaveProjectId: number;
  currentMasterId: number;
  onRefetch: () => void;
}

/**
 *
 */
export default function ChangeMasterCombobox({
  slaveProjectId,
  currentMasterId,
  onRefetch,
}: ChangeMasterComboboxProps) {
  return (
    <ProjectCombobox
      placeholder="Projekt-ID oder Titel…"
      emptyText="Keine Master-Projekte gefunden"
      onSearch={(query) => fetchMasterCandidates(query, slaveProjectId, currentMasterId)}
      onLink={async (project) => {
        await setProjectCanonical(slaveProjectId, project.id);
      }}
      confirmMessage={(p) => `Master von Projekt #${slaveProjectId} auf #${p.id} – ${p.title} ändern?`}
      onLinked={onRefetch}
    />
  );
}
