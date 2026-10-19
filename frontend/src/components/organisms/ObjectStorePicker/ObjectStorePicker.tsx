import { useCallback, useId, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@src/components/primitives/Dialog';
import Icon from '@src/components/primitives/Icon/Icon';
import Image from '@src/components/primitives/Image/Image';
import Input from '@src/components/primitives/Input/Input';
import NativeSelect from '@src/components/primitives/NativeSelect/NativeSelect';
import Spinner from '@src/components/primitives/Spinner/Spinner';
import Text from '@src/components/primitives/Text/Text';

import ObjectStoreAssetGrid from './ObjectStoreAssetGrid';
import { deleteObjectStoreAsset, uploadObjectStoreAsset } from './ObjectStorePicker.service';
import {
  pickerFolderSelectVariants,
  pickerListScrollVariants,
  pickerPreviewVariants,
  pickerUploadBarVariants,
} from './ObjectStorePicker.variants';

import type { ObjectStorePickerProps } from './ObjectStorePicker.interface';
import type { AssetInfo } from './ObjectStorePicker.service';

export type { ObjectStorePickerProps } from './ObjectStorePicker.interface';

/**
 * ObjectStorePicker – Wiederverwendbarer Datei-Picker für ObjectStore-Assets.
 *
 * Öffnet einen großen Dialog mit Suchfeld und responsive Thumbnail-Grid der
 * vorhandenen Assets (Bild als primäre Identifikation, Originalname darunter).
 * Die Asset-Liste wird beim ersten Öffnen via ``loadAssets`` geladen,
 * client-seitig nach Upload-Zeit sortiert (neueste zuerst) und gefiltert.
 * Ungenutzte Bilder lassen sich pro Asset über einen Delete-Button (mit
 * Bestätigungs-Dialog) entfernen. Eine Auswahl wird über ``onChange`` an den
 * Aufrufer zurückgegeben.
 */
export type { ObjectStorePickerVariants } from './ObjectStorePicker.variants';

export default function ObjectStorePicker({
  value,
  onChange,
  loadAssets,
  getPreviewUrl,
  dialogTitle = 'Asset auswählen',
  dialogSize = 'full',
  placeholder = 'Asset auswählen…',
  searchPlaceholder = 'Datei suchen…',
  emptyLabel = 'Keine Assets gefunden.',
  disabled = false,
  trigger,
  uploadPrefix,
  prefix,
}: ObjectStorePickerProps) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<AssetInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const fileInputId = `${useId()}-file`;

  // Default-Ordner: explizites `prefix` > erstes Segment von `uploadPrefix` > "all".
  const defaultFolder = useMemo(() => {
    if (prefix) return prefix;
    const first = uploadPrefix?.split('/')[0];
    return first || 'all';
  }, [prefix, uploadPrefix]);

  // Lädt die Asset-Liste einmalig beim ersten Öffnen und cached sie.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      setFolder(defaultFolder);
      if (!next) {
        setSearch('');
        return;
      }
      if (assets !== null) return;
      setLoading(true);
      setLoadError(false);
      loadAssets()
        .then(setAssets)
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false));
    },
    [assets, defaultFolder, loadAssets],
  );

  // Lädt die Liste erneut (z.B. nach einem Upload) und hebt einen Key hervor.
  const reloadAssets = useCallback(
    async (highlight?: string) => {
      setLoading(true);
      setLoadError(false);
      try {
        const next = await loadAssets();
        setAssets(next);
        setHighlightKey(highlight ?? null);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [loadAssets],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Allow re-selecting the same file after an error
      e.target.value = '';
      if (!file || !uploadPrefix) return;
      setUploading(true);
      setUploadError(null);
      try {
        const { key } = await uploadObjectStoreAsset(file, uploadPrefix);
        await reloadAssets(key);
      } catch {
        setUploadError('Upload fehlgeschlagen.');
      } finally {
        setUploading(false);
      }
    },
    [uploadPrefix, reloadAssets],
  );

  // Verfügbare Top-Level-Ordner aus den geladenen Assets (für das Dropdown).
  const folderOptions = useMemo(() => {
    const folders = (assets ?? []).reduce((acc, asset) => {
      const seg = asset.key.split('/')[0];
      if (seg) acc.add(seg);
      return acc;
    }, new Set<string>());
    return [...folders].sort();
  }, [assets]);

  // Filter auf Ordner (Default/Auswahl) + Name (Fallback: Key), case-insensitive.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assets ?? []).filter((asset) => {
      const matchesFolder =
        folder === 'all' || asset.key === folder || asset.key.startsWith(`${folder}/`);
      const matchesSearch = q
        ? asset.name.toLowerCase().includes(q) || asset.key.toLowerCase().includes(q)
        : true;
      return matchesFolder && matchesSearch;
    });
  }, [assets, search, folder]);

  // Sortierung nach Upload-Zeit (neueste zuerst), stabil bei fehlendem createdAt.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : NaN;
      const tb = b.createdAt ? Date.parse(b.createdAt) : NaN;
      if (Number.isNaN(ta) && Number.isNaN(tb)) return a.key.localeCompare(b.key);
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });
  }, [filtered]);

  const select = useCallback(
    (key: string) => {
      onChange(key);
      setOpen(false);
    },
    [onChange],
  );

  // Delete: Liste neu laden; gelöschte Auswahl zurücksetzen + Hervorhebung aufheben.
  const handleConfirmDelete = useCallback(
    async (key: string) => {
      await deleteObjectStoreAsset(key);
      if (value === key) onChange('');
      setHighlightKey((prev) => (prev === key ? null : prev));
      await reloadAssets();
    },
    [onChange, reloadAssets, value],
  );

  const previewUrl = value ? (getPreviewUrl?.(value) ?? null) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        disabled={disabled}
        className="inline-flex items-center"
      >
        {trigger ? (
          trigger(value)
        ) : (
          <div className={[
            'flex min-h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          ].join(' ')}
          >
            {previewUrl && (
              <div className={pickerPreviewVariants()}>
                <Image
                  src={previewUrl}
                  alt="Vorschau"
                  fit="cover"
                  frame="none"
                  fallback={null}
                />
              </div>
            )}
            <Text
              as="span"
              size="sm"
              color={value ? 'default' : 'muted'}
              lineClamp={1}
            >
              {value || placeholder}
            </Text>
          </div>
        )}
      </DialogTrigger>

      <DialogContent size={dialogSize}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              disabled={disabled}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              leftIcon={<Icon name="search" size="xs" />}
            />
          </div>
          {folderOptions.length >= 2 && (
            <div className={pickerFolderSelectVariants()}>
              <NativeSelect
                size="sm"
                value={folder}
                aria-label="Ordner"
                onChange={(e) => setFolder((e.target as HTMLSelectElement).value)}
              >
                <option value="all">Alle Ordner</option>
                {folderOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>

        <div className={pickerListScrollVariants()}>
          {loading && (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          )}

          {!loading && loadError && (
            <div className="py-8">
              <Text size="sm" color="error" align="center">
                Assets konnten nicht geladen werden.
              </Text>
            </div>
          )}

          {!loading && !loadError && (
            <ObjectStoreAssetGrid
              assets={sorted}
              value={value}
              highlightKey={highlightKey}
              getPreviewUrl={getPreviewUrl}
              onSelect={select}
              onConfirmDelete={handleConfirmDelete}
              emptyLabel={emptyLabel}
            />
          )}
        </div>

        {uploadPrefix && (
          <div className={pickerUploadBarVariants()}>
            <Input
              id={fileInputId}
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              <Icon name="upload" size="xs" />
              {uploading ? 'Lädt…' : 'Hochladen'}
            </Button>
            {uploadError && (
              <div className="mt-1">
                <Text size="xs" color="error">
                  {uploadError}
                </Text>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
