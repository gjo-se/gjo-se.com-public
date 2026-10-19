/**
 * ProofSortableRow – Drag&Drop-fähige Tabellenzeile mit Inline-Edit.
 *
 * Zeigt Drag-Handle (⋮⋮), Bild-Vorschau (image_src, klickbar → Textfeld),
 * Statement der aktuellen Locale (Inline-Edit) und Delete-Aktion.
 */

import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import InlinePriorityCell from '@src/components/table/InlinePriorityCell';
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';
import type { components } from '@src/lib/types.generated';

import { PRIORITY_OPTIONS, PROOF_COLUMNS, PROOF_ROW_HEIGHT } from '../../utils/proofSubTableColumns';

import ImageSrcCell from './ImageSrcCell';
import QuestionCell from './QuestionCell';
import StatementCell from './StatementCell';

type ProofAdminOut = components['schemas']['ProofAdminOut'];

interface ProofSortableRowProps {
  proof: ProofAdminOut;
  locale: 'de' | 'en';
  /** ObjectStore-Prefix für den Proof-Bild-Upload über den Picker (z.B. "portfolio/{slug}"). */
  uploadPrefix: string;
  onDelete: (id: number) => void;
  onInlineEdit: (id: number, field: string, value: string) => Promise<string | null>;
  onStatementSave: (proof: ProofAdminOut, statement: string) => Promise<string | null>;
  onQuestionSave: (proof: ProofAdminOut, question: string) => Promise<string | null>;
}

/** Single sortable proof row with drag handle, inline-edit, and delete action. */
export default function ProofSortableRow({
  proof,
  locale,
  uploadPrefix,
  onDelete,
  onInlineEdit,
  onStatementSave,
  onQuestionSave,
}: ProofSortableRowProps) {
  return (
    <SortableRow
      id={proof.id}
      columns={PROOF_COLUMNS}
      rowHeight={PROOF_ROW_HEIGHT}
      trProps={{ 'data-proof-id': proof.id }}
      renderColumn={(col) => {
        if (col.key === '_actions') {
          return (
            <TableCell key={col.key} compact alignment="center">
              <Button
                variant="ghost"
                size="xs"
                title="Löschen"
                aria-label="Löschen"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete(proof.id);
                }}
              >
                <Icon name="trash-2" size="xs" />
              </Button>
            </TableCell>
          );
        }
        if (col.key === 'image_src') {
          return (
            <TableCell key={col.key}>
              <ImageSrcCell
                src={proof.image_src ?? null}
                uploadPrefix={uploadPrefix}
                onSave={(v) => { void onInlineEdit(proof.id, 'image_src', v); }}
              />
            </TableCell>
          );
        }
        if (col.key === 'priority') {
          return (
            <TableCell key={col.key}>
              <InlinePriorityCell
                value={proof.priority}
                options={PRIORITY_OPTIONS}
                onChange={(v) => { void onInlineEdit(proof.id, 'priority', v); }}
              />
            </TableCell>
          );
        }
        if (col.key === 'question') {
          return (
            <TableCell key={col.key}>
              <QuestionCell
                value={proof.questions[locale] ?? ''}
                onSave={(question) => { void onQuestionSave(proof, question); }}
              />
            </TableCell>
          );
        }
        // statement – Inline-Edit der aktuellen Locale (Markdown-Textarea)
        return (
          <TableCell key={col.key}>
            <StatementCell
              value={proof.statements[locale] ?? ''}
              onSave={(value) => { void onStatementSave(proof, value); }}
            />
          </TableCell>
        );
      }}
    />
  );
}
