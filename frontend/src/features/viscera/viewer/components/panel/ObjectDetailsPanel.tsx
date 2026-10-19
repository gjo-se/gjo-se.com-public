import { cva } from 'class-variance-authority';
import { useCallback, useMemo } from 'react';

import AlertDialog from '@src/components/primitives/AlertDialog/AlertDialog';
import Button from '@src/components/primitives/Button/Button';
import Sheet from '@src/components/primitives/Sheet/Sheet';
import SheetContent from '@src/components/primitives/Sheet/SheetContent';
import Text from '@src/components/primitives/Text/Text';
import { useWorkspace } from '@src/features/viscera/core/useWorkspace';
import type { Diagram } from '@src/features/viscera/core/workspaceSchema';
import { useViewState } from '@src/features/viscera/hooks/useViewState';

import { useDetailPanel } from '../../hooks/useDetailPanel';
import { useObjectDetail } from '../../hooks/useObjectDetail';
import { useYamlWrite } from '../../hooks/useYamlWrite';
import { AnnotationsTab } from '../detail-tabs/AnnotationsTab';
import {
  BADGE_BG_MAP,
  DERIVED_TABS,
  HEADER_CLASS,
  TABS,
  type TabKey,
} from '../detail-tabs/constants';
import { EdgesTab } from '../detail-tabs/EdgesTab';
import { HistoryTab } from '../detail-tabs/HistoryTab';
import RejectedNoticeDialog from '../dialog/RejectedNoticeDialog';
import { EditableField } from '../field/EditableField';

import { DetailsTab } from './DetailsTab';

const panelColumnVariants = cva('flex h-full flex-col overflow-hidden px-4');
const typeBadgeVariants = cva('rounded px-2 py-0.5 text-xs font-semibold text-gray-100');

export interface ObjectDetailsPanelProps {
  objectId: string | null;
  onClose: () => void;
}

/**
 * Pure composition layer: four tabs, header, status controls, dialogs.
 * All business logic lives in `useDetailPanel`.
 */
export function ObjectDetailsPanel({ objectId, onClose }: ObjectDetailsPanelProps) {
  const detail = useObjectDetail(objectId);
  const { workspace } = useWorkspace();
  const { objectTab, setObjectTab } = useViewState();
  const { writeField } = useYamlWrite();
  const panel = useDetailPanel({ objectId, detail, onClose });
  const isDerived = detail?.isDerived ?? false;
  const onFieldSave = isDerived ? panel.handleDerivedFieldSave : writeField;
  const activeTab = useMemo<TabKey>(() => {
    if (isDerived) return 'details';
    return objectTab === 'edges' || objectTab === 'history' || objectTab === 'annotations'
      ? objectTab
      : 'details';
  }, [objectTab, isDerived]);
  const handleTabChange = useCallback((tab: TabKey) => setObjectTab(tab), [setObjectTab]);
  const handleOpenChange = useCallback(
    (open: boolean) => { if (!open) onClose(); },
    [onClose],
  );
  const isOpen = objectId !== null && detail !== null;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" style={{ width: '400px' }}>
        {detail === null ? (
          <div className="flex items-center justify-center p-8">
            <Text color="muted" size="sm">Object not found.</Text>
          </div>
        ) : (
          <div className={panelColumnVariants()}>
            <nav className="flex gap-1 border-b pb-2 pt-2" role="tablist">
              {(isDerived ? DERIVED_TABS : TABS).map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabChange(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>
            <div className={HEADER_CLASS}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {detail.objectId && !isDerived ? (
                    <EditableField
                      value={detail.name}
                      field="name"
                      objectId={detail.objectId}
                      onSave={writeField}
                    />
                  ) : (
                    <Text variant="h3" weight="bold">{detail.name}</Text>
                  )}
                  <div
                    className={typeBadgeVariants()}
                    style={{ backgroundColor: BADGE_BG_MAP[detail.typeLabel] ?? '#6b7280' }}
                  >
                    {detail.typeLabel}
                  </div>
                  {!isDerived && (
                    <Button variant="destructive" size="sm" onClick={panel.handleDeleteClick}>
                      {'\uD83D\uDDD1 Objekt l\u00F6schen'}
                    </Button>
                  )}
                </div>
                {detail.technologies.length > 0 && (
                  <Text color="muted" size="sm">{detail.technologies.join(', ')}</Text>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {isDerived && (
                <div className="px-4 pb-2">
                  <Button
                    size="sm"
                    fullWidth
                    disabled={!panel.canGenerateDescription || panel.generatingDescription}
                    onClick={panel.handleGenerateDescription}
                  >
                    {panel.generatingDescription ? 'Generiere…' : 'Beschreibung generieren'}
                  </Button>
                </div>
              )}
              {activeTab === 'details' && (
                <DetailsTab
                  detail={detail}
                  copied={panel.copied}
                  onCopy={panel.handleCopy}
                  onFieldSave={onFieldSave}
                  onStatusChange={panel.handleStatusChange}
                />
              )}
              {activeTab === 'edges' && objectId && workspace && (
                <EdgesTab
                  objectId={objectId}
                  edges={workspace.edges}
                  diagrams={(workspace.diagrams ?? []) as Diagram[]}
                />
              )}
              {activeTab === 'history' && <HistoryTab objectId={objectId} />}
              {activeTab === 'annotations' && (
                <AnnotationsTab
                  annotations={detail.annotations}
                  editingIndex={panel.editingIndex}
                  editText={panel.editText}
                  newAnnotationText={panel.newAnnotationText}
                  isSaving={panel.annotationSaving}
                  onAdd={panel.handleAddAnnotation}
                  onStartEdit={panel.handleEditAnnotation}
                  onSaveEdit={panel.handleSaveEdit}
                  onCancelEdit={panel.handleCancelEdit}
                  onDelete={panel.handleDeleteAnnotation}
                  onNewTextChange={panel.setNewAnnotationText}
                />
              )}
            </div>
            <AlertDialog
              open={panel.deleteDialogOpen}
              onOpenChange={panel.setDeleteDialogOpen}
              title="Objekt l\u00F6schen"
              description={panel.deleteWarning}
              confirmLabel={panel.deleting ? 'L\u00F6sche...' : 'L\u00F6schen'}
              cancelLabel="Abbrechen"
              onConfirm={panel.handleDeleteConfirm}
              destructive
            />
            <RejectedNoticeDialog
              open={panel.rejectionDialogOpen}
              onOpenChange={panel.setRejectionDialogOpen}
              detail={detail}
              onConfirm={panel.handleRejectionConfirm}
              isSending={panel.rejectionSending}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
