/**
 * ProfilePhotoRow – Custom-DetailTable-Zeile für das Porträtfoto.
 *
 * Rundbild-Vorschau über den generischen Stream-Endpoint (URL aus dem
 * Storage-Key via `getStreamUrl`, mit Cache-Busting).
 * Auswahl UND Upload erfolgen über `ObjectStorePicker` (SOTA-Pattern,
 * identisch zum Portfolio-Proof "Bild"-Feld): Der Picker lädt neue Bilder
 * über den zentralen Asset-Endpoint unter `profile/` hoch (UUID-Key).
 * Muster: ImageSrcCell (Proof), DetailTable-Grid-Stil.
 */
import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

import ObjectStorePicker from '@src/components/organisms/ObjectStorePicker/ObjectStorePicker';
import Icon from '@src/components/primitives/Icon/Icon';
import Image from '@src/components/primitives/Image/Image';
import Text from '@src/components/primitives/Text';
import { listApplicationProfileAssets } from '@src/lib/api/applicationProfile';
import { getStreamUrl } from '@src/lib/getStreamUrl';


const ROW_GRID =
  'grid grid-cols-[1fr_2fr] items-center gap-x-4 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50';

const previewVariants = cva(
  'h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800',
);

const placeholderVariants = cva(
  'flex h-16 w-16 items-center justify-center text-on-surface-muted',
);

export interface ProfilePhotoRowProps {
  photoUrl: string | null | undefined;
  /** Initial cache-busting version (profile.updatedAt). */
  version: string;
  /** Persists the selected storage key (from the ObjectStorePicker). */
  onSelect?: (key: string) => void;
}

/** Porträtfoto row: round preview + ObjectStorePicker (Auswahl + Upload). */
export default function ProfilePhotoRow({ photoUrl, version, onSelect }: ProfilePhotoRowProps) {
  // Cache-busting nonce: the stream endpoint is cached (max-age 3600) and
  // `updatedAt` does not change on upload, so we bump a local nonce after
  // each successful select to force the preview to reload.
  const [nonce, setNonce] = useState(version);

  const previewUrl = photoUrl
    ? `${getStreamUrl(photoUrl)}?v=${encodeURIComponent(nonce)}`
    : null;

  const handleSelect = useCallback(
    (key: string) => {
      onSelect?.(key);
      setNonce(String(Date.now()));
    },
    [onSelect],
  );

  const pickerTrigger = () => (
    <Icon
      name="folder-kanban"
      size="sm"
      shrink
      label="Asset auswählen"
    />
  );

  return (
    <div className={ROW_GRID}>
      <Text as="label" size="xs" weight="medium" uppercase color="muted">
        Porträtfoto
      </Text>
      <div className="flex items-center gap-3">
        <div className={previewVariants()}>
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Porträtfoto"
              fit="cover"
              loading="eager"
            />
          ) : (
            <div className={placeholderVariants()} title="Kein Foto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a8.25 8.25 0 0 1 15 0" />
              </svg>
            </div>
          )}
        </div>
        <ObjectStorePicker
          value={photoUrl ?? null}
          onChange={handleSelect}
          loadAssets={() => listApplicationProfileAssets('profile/')}
          getPreviewUrl={getStreamUrl}
          uploadPrefix="profile"
          trigger={pickerTrigger}
        />
      </div>
    </div>
  );
}
