import { cva } from 'class-variance-authority';
import { useCallback } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Card from '@src/components/primitives/Card/Card';
import Icon from '@src/components/primitives/Icon/Icon';
import List from '@src/components/primitives/List/List';
import Separator from '@src/components/primitives/Separator/Separator';
import Sheet from '@src/components/primitives/Sheet/Sheet';
import SheetContent from '@src/components/primitives/Sheet/SheetContent';
import Text from '@src/components/primitives/Text/Text';
import type { Group } from '@src/features/viscera/core/workspaceSchema';

import { EditableField } from '../field/EditableField';

import type { GroupMemberEntry } from '../../hooks/useGroupDetail';
import type { WriteResult } from '../../hooks/useYamlWrite';

const panelColumnVariants = cva('flex h-full flex-col overflow-hidden px-4');
const groupBadgeVariants = cva('rounded px-2 py-0.5 text-xs font-semibold text-gray-100');
const textCellVariants = cva('min-w-0 break-words');

// ── Props ────────────────────────────────────────────────────────────────────

interface GroupDetailsPanelProps {
  /** Selected group ID (null while the panel is closed). */
  groupId: string | null;
  /** Resolved group entity (null while loading or if not found). */
  group: Group | null;
  /** Members of the group with resolved node names. */
  members: GroupMemberEntry[];
  /** Called to close the panel (✕ or Escape). */
  onClose: () => void;
  /** Rename handler (optimistic + ``update_group`` sync). */
  onRename: (name: string) => void;
  /** Description update handler (optimistic + ``update_group`` sync). */
  onDescriptionChange: (description: string) => void;
  /** Member removal handler (optimistic + ``group_members`` sync). */
  onRemoveMember: (memberId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Detail panel for architecture groups (#2279) — analog to ObjectDetailsPanel.
 *
 * Pure composition layer: name/description inline editing via EditableField,
 * member list with per-member remove button. All business logic lives in
 * ``useGroupDetail``. The Sheet's built-in ✕ button closes via ``onOpenChange``;
 * Escape handling is provided by the hook.
 */
function GroupDetailsPanel({
  groupId,
  group,
  members,
  onClose,
  onRename,
  onDescriptionChange,
  onRemoveMember,
}: GroupDetailsPanelProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  // Adapter: EditableField expects an object write (objectId, field, value) —
  // route name/description edits to the group-specific optimistic handlers.
  const handleFieldSave = useCallback(
    (_objectId: string, field: string, value: unknown): Promise<WriteResult> => {
      const text = typeof value === 'string' ? value : String(value);
      if (field === 'name') {
        onRename(text);
      } else if (field === 'description') {
        onDescriptionChange(text);
      }
      return Promise.resolve({ success: true });
    },
    [onRename, onDescriptionChange],
  );

  const isOpen = groupId !== null;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" style={{ width: '400px' }}>
        {group === null ? (
          <div className="flex items-center justify-center p-8">
            <Text color="muted" size="sm">Group not found.</Text>
          </div>
        ) : (
          <div className={panelColumnVariants()}>
            <div className="flex flex-col gap-1 pt-2 pb-2">
              <div className="flex items-center gap-2">
                <EditableField
                  value={group.name}
                  field="name"
                  objectId={group.id}
                  onSave={handleFieldSave}
                />
                <div
                  className={groupBadgeVariants()}
                  style={{ backgroundColor: '#6b7280' }}
                >
                  Group
                </div>
              </div>
              <Text color="muted" size="sm">Members: {members.length}</Text>
            </div>
            <Separator />

            <div className="flex-1 overflow-y-auto py-2">
              <div className="mb-1 block">
                <Text weight="semibold" size="sm">
                  Description
                </Text>
              </div>
              <EditableField
                value={group.description}
                field="description"
                objectId={group.id}
                onSave={handleFieldSave}
                multiline
              />

              <div className="mt-4 mb-1 block">
                <Text weight="semibold" size="sm">
                  Members
                </Text>
              </div>
              {members.length === 0 ? (
                <Text color="muted" size="sm">Keine Members</Text>
              ) : (
                <List
                  spacing="default"
                  items={members.map((member) => (
                    <Card key={member.id} size="sm">
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <div className={textCellVariants()}>
                          <Text size="sm">
                            {member.name}
                          </Text>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${member.name} aus Group entfernen`}
                          title={`${member.name} aus Group entfernen`}
                          onClick={() => onRemoveMember(member.id)}
                        >
                          <Icon name="x" size="xs" aria-hidden />
                        </Button>
                      </div>
                    </Card>
                  ))}
                />
              )}
              <div className="mt-2 block">
                <Text color="muted" size="xs">
                  Entfernen löst nur die Zuordnung – der Node bleibt bestehen.
                </Text>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default GroupDetailsPanel;
