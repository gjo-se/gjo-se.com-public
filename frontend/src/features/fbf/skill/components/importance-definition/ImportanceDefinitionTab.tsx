/**
 * ImportanceDefinitionTab – Tag-style management table for FBF importance definitions.
 *
 * Standard Table like other admin tables: all importance definitions in one table,
 * inline-edit for label + description.
 */

import DefinitionTable from '@src/components/table/DefinitionTable';

import { fetchImportanceDefinitions, updateImportanceDefinition, type ImportanceDefinition } from '../../services/importanceDefinitions';

/** Renders the importance definition management table (inline edit). */
export default function ImportanceDefinitionTab() {
  return (
    <DefinitionTable<ImportanceDefinition>
      tableKey="admin-importance-definitions"
      valueField="importance"
      valueColumnLabel="Wert"
      getValue={(row) => row.importance}
      load={fetchImportanceDefinitions}
      update={updateImportanceDefinition}
      loadErrorMessage="Fehler beim Laden der Importance-Definitionen."
      saveErrorMessage="Fehler beim Speichern der Importance-Definition."
      emptyMessage="Keine Importance-Definitionen gefunden."
    />
  );
}
