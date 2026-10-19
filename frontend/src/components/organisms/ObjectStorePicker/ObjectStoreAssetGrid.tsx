import { useCallback, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Icon from '@src/components/primitives/Icon/Icon';
import Image from '@src/components/primitives/Image/Image';
import Text from '@src/components/primitives/Text/Text';

import {
  assetCaptionVariants,
  assetDeleteOverlayVariants,
  assetFilenameVariants,
  assetIconCenterVariants,
  assetThumbVariants,
} from './ObjectStoreAssetGrid.variants';

import type { AssetInfo } from './ObjectStorePicker.service';

export interface ObjectStoreAssetGridProps {
  /** Gefilterte und sortierte Asset-Liste. */
  assets: AssetInfo[];
  /** Aktuell ausgewählter Storage-Key. */
  value: string | null;
  /** Key des frisch hochgeladenen Assets (Hervorhebung). */
  highlightKey: string | null;
  /** Optional: Preview-URL für einen Key (Thumbnail). */
  getPreviewUrl?: (key: string) => string | null;
  /** Auswahl-Handler (liefert den Key). */
  onSelect: (key: string) => void;
  /** Bestätigungs-Handler nach Delete-Bestätigung (Picker lädt Liste neu). */
  onConfirmDelete: (key: string) => Promise<void>;
  /** Label bei leerer Liste. */
  emptyLabel: string;
}

/**
 * ObjectStoreAssetGrid – Responsive Thumbnail-Grid für den ObjectStorePicker.
 *
 * Rendert pro Asset ein Thumbnail (Bild als primäre Identifikation) mit dem
 * Originaldateinamen darunter (truncate + Tooltip). Pro Asset gibt es einen
 * Delete-Button (Icon oben rechts), der einen Bestätigungs-Dialog öffnet – erst
 * nach Bestätigung wird das Asset gelöscht.
 */
export type { ObjectStoreAssetGridVariants } from './ObjectStoreAssetGrid.variants';

export default function ObjectStoreAssetGrid({
  assets,
  value,
  highlightKey,
  getPreviewUrl,
  onSelect,
  onConfirmDelete,
  emptyLabel,
}: ObjectStoreAssetGridProps) {
  const [deleteTarget, setDeleteTarget] = useState<AssetInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onConfirmDelete(deleteTarget.key);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onConfirmDelete]);

  if (assets.length === 0) {
    return (
      <div className="py-8">
        <Text size="sm" color="muted" align="center">
          {emptyLabel}
        </Text>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((asset) => {
          const url = getPreviewUrl?.(asset.key) ?? null;
          const isSelected = asset.key === value;
          const isHighlighted = asset.key === highlightKey;
          // Pfad aufbrechen: Ordner-Breadcrumb oben, Dateiname darunter. Der
          // Ordner stammt aus dem Key (echter Pfad); der Dateiname ist der
          // Originalname `name`, falls dieser ein reiner Basename ist (Uploads),
          // sonst der Key-Basename (Legacy, wo name == Key).
          const lastSlash = asset.key.lastIndexOf('/');
          const folder = lastSlash > 0 ? asset.key.slice(0, lastSlash) : '';
          const keyFilename = lastSlash >= 0 ? asset.key.slice(lastSlash + 1) : asset.key;
          const filename = asset.name.includes('/') ? keyFilename : asset.name;
          return (
            <div
              key={asset.key}
              className={[
                'group relative cursor-pointer overflow-hidden rounded-lg border bg-muted/30 transition-colors',
                isSelected
                  ? 'border-primary ring-2 ring-primary'
                  : isHighlighted
                    ? 'border-primary ring-1 ring-inset ring-primary'
                    : 'border-border hover:border-primary/50',
              ].join(' ')}
              onClick={() => onSelect(asset.key)}
            >
              <div className={assetThumbVariants()}>
                {url ? (
                  <Image
                    src={url}
                    alt={asset.name}
                    fit="cover"
                    frame="none"
                    fallback={null}
                  />
                ) : (
                  <div className={assetIconCenterVariants()}>
                    <Icon name="image-off" size="sm" variant="muted" />
                  </div>
                )}
                <div className={assetDeleteOverlayVariants()}>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    aria-label={`Asset ${asset.name} löschen`}
                    title="Löschen"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setDeleteTarget(asset);
                    }}
                  >
                    <Icon name="trash-2" size="xs" />
                  </Button>
                </div>
              </div>
              <div className={assetCaptionVariants()}>
                {folder && (
                  <Text
                    as="span"
                    size="xs"
                    color="muted"
                    title={folder}
                    lineClamp={1}
                  >
                    {folder}/
                  </Text>
                )}
                <div className={assetFilenameVariants()}>
                  <Text
                    as="span"
                    size="xs"
                    title={filename}
                  >
                    {filename}
                  </Text>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Asset löschen</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {deleteTarget
              ? `„${deleteTarget.name}" wird unwiderruflich gelöscht. Fortfahren?`
              : ''}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? 'Lädt…' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
