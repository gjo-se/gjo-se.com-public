/**
 * ImageSrcCell – Editierbare Zelle für den Proof-`image_src`.
 *
 * Idle: zeigt den Storage-Key als normalen Text (wie andere Inline-Edits) +
 * Picker-Button. Klick → Textfeld zum Bearbeiten des Pfads.
 * Enter/blur speichert, Escape bricht ab.
 * Bei gesetztem `uploadPrefix` bietet der Picker zusätzlich einen Upload.
 */
import { useEffect, useState } from 'react';

import ObjectStorePicker from '@src/components/organisms/ObjectStorePicker/ObjectStorePicker';
import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';
import { getStreamUrl } from '@src/lib/getStreamUrl';

import { listPortfolioAssets } from '../../services/portfolioService';

import { SRC_CELL } from './constants';

/** Zelle mit Inline-Edit für den Bild-Pfad. */
export default function ImageSrcCell({
  src,
  onSave,
  uploadPrefix,
}: {
  src: string | null;
  onSave: (v: string) => void;
  /** Optionaler ObjectStore-Prefix für den Upload über den Picker (z.B. "portfolio/{slug}"). */
  uploadPrefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(src ?? '');
  // Originalname je Storage-Key (aus dem Asset-Listing) – zeigt statt des Hashes
  // den sprechenden Dateinamen an (Datenfluss aus dem Asset-Modul).
  const [nameByKey, setNameByKey] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let active = true;
    listPortfolioAssets()
      .then((assets) => {
        if (!active) return;
        setNameByKey(
          assets.reduce<Record<string, string>>((acc, asset) => {
            acc[asset.key] = asset.name;
            return acc;
          }, {}),
        );
      })
      .catch(() => {
        if (active) setNameByKey({});
      });
    return () => {
      active = false;
    };
  }, []);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== (src ?? '')) onSave(draft.trim());
  };

  const cancel = () => {
    setEditing(false);
    setDraft(src ?? '');
  };

  const pickerTrigger = () => (
    <Icon
      name="folder-kanban"
      size="sm"
      shrink
      label="Asset auswählen"
    />
  );

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
        />
        <ObjectStorePicker
          value={draft || null}
          onChange={(key) => { setDraft(key); setEditing(false); onSave(key); }}
          loadAssets={() => listPortfolioAssets()}
          getPreviewUrl={getStreamUrl}
          uploadPrefix={uploadPrefix}
          trigger={pickerTrigger}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className={SRC_CELL}
        onClick={() => { setDraft(src ?? ''); setEditing(true); }}
      >
        <Text as="span" size="sm" color={src ? undefined : 'muted'}>
          {src ? (nameByKey?.[src] ?? src) : '\u2013'}
        </Text>
      </div>
      <ObjectStorePicker
        value={src}
        onChange={(key) => onSave(key)}
        loadAssets={() => listPortfolioAssets()}
        getPreviewUrl={getStreamUrl}
        uploadPrefix={uploadPrefix}
        trigger={pickerTrigger}
      />
    </div>
  );
}
