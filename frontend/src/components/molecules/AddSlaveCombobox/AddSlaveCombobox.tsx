/**
 * AddSlaveCombobox – Ein Projekt als Slave zu einem Master hinzufügen.
 *
 * Dünner Wrapper um die `ProjectCombobox` (debounced Suche, Bestätigungs-Dialog).
 */
import ProjectCombobox from '@src/components/molecules/ProjectCombobox/ProjectCombobox';
import {
  fetchSlaveCandidates,
  setProjectCanonical,
} from '@src/lib/api/aiscope';

export interface AddSlaveComboboxProps {
  canonicalProjectId: number;
  onRefetch: () => void;
}

/**
 *
 */
export default function AddSlaveCombobox({ canonicalProjectId, onRefetch }: AddSlaveComboboxProps) {
  return (
    <ProjectCombobox
      placeholder="Projekt-ID oder Titel…"
      emptyText="Keine verknüpfbaren Projekte gefunden"
      onSearch={(query) => fetchSlaveCandidates(query, canonicalProjectId)}
      onLink={async (project) => {
        await setProjectCanonical(project.id, canonicalProjectId);
      }}
      confirmMessage={(p) =>
        `Projekt #${p.id} – ${p.title} als Slave zu Projekt #${canonicalProjectId} hinzufügen?`
      }
      onLinked={onRefetch}
    />
  );
}
