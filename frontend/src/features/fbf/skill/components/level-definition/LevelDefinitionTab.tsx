/**
 * LevelDefinitionTab – Tag-style management table for FBF level definitions.
 *
 * Standard Table like other admin tables: all level definitions in one table,
 * inline-edit for label + description.
 */

import DefinitionTable from '@src/components/table/DefinitionTable';

import { fetchLevelDefinitions, updateLevelDefinition, type LevelDefinition } from '../../services/levelDefinitions';

/** Renders the level definition management table (inline edit). */
export default function LevelDefinitionTab() {
  return (
    <DefinitionTable<LevelDefinition>
      tableKey="admin-level-definitions"
      valueField="level"
      valueColumnLabel="Level"
      getValue={(row) => row.level}
      load={fetchLevelDefinitions}
      update={updateLevelDefinition}
      loadErrorMessage="Fehler beim Laden der Level-Definitionen."
      saveErrorMessage="Fehler beim Speichern der Level-Definition."
      emptyMessage="Keine Level-Definitionen gefunden."
    />
  );
}
