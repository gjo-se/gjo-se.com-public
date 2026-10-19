/**
 * SkillGroupGhostRow – Inline-Erstellungszeile fuer neue Skill-Gruppen (Cmd+Enter).
 *
 * Pflichtfeld: Label DE. Label EN ist optional, Prioritaet waehlbar.
 * Validiert vor Submit; Fehler werden ueber das error-Prop angezeigt.
 * Muster analog ProofSubTable-GhostRow.
 */

import {
  GhostRowInputCell,
  GhostRowPriorityCell,
  GhostRowShell,
} from '@src/components/table/GhostRow';
import TableCell from '@src/components/table/TableCell';

import {
  GROUP_COLUMNS,
  GROUP_ROW_HEIGHT,
  PRIORITY_OPTIONS,
} from '../../utils/skillGroupAdminTabColumns';

interface SkillGroupGhostRowProps {
  saving: boolean
  data: Record<string, string>
  onChange: (field: string, value: string) => void
  onSubmit: () => void
  error: string | null
}

/** Rendert Input-Felder fuer Label DE/EN (DE Pflicht) und Prioritaet. */
export default function SkillGroupGhostRow({ saving, data, onChange, onSubmit, error }: SkillGroupGhostRowProps) {
  return (
    <GhostRowShell
      saving={saving}
      error={error}
      colSpan={GROUP_COLUMNS.length}
      rowHeight={GROUP_ROW_HEIGHT}
      onSubmit={onSubmit}
    >
      {({ touched, handleKeyDown }) =>
        GROUP_COLUMNS.map((col) => {
          if (col.key === '_drag' || col.key === '_actions') {
            return <TableCell key={col.key} />;
          }
          if (col.key === 'priority') {
            return (
              <GhostRowPriorityCell
                key={col.key}
                field={col.key}
                data={data}
                saving={saving}
                options={PRIORITY_OPTIONS}
                onChange={onChange}
              />
            );
          }
          const isRequired = col.key === 'label_de';
          return (
            <GhostRowInputCell
              key={col.key}
              field={col.key}
              data={data}
              saving={saving}
              touched={touched}
              required={isRequired}
              placeholder={isRequired ? 'Label DE *' : 'Label EN'}
              onChange={onChange}
              onKeyDown={handleKeyDown}
            />
          );
        })
      }
    </GhostRowShell>
  );
}
