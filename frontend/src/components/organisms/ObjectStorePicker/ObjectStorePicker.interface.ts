import type { AssetInfo } from './ObjectStorePicker.service';
import type { ReactNode } from 'react';

/** Props for the reusable ObjectStore file picker. */
export interface ObjectStorePickerProps {
  /** Current storage key (null = none selected). */
  value: string | null;
  /** Called with the selected storage key. */
  onChange: (key: string) => void;
  /** Loads all candidate assets (invoked once on first open). */
  loadAssets: () => Promise<AssetInfo[]>;
  /** Optional: build a preview URL for a key (thumbnail). Return null to skip. */
  getPreviewUrl?: (key: string) => string | null;
  /** Titel des Auswahl-Dialogs (Standard: „Asset auswählen"). */
  dialogTitle?: string;
  /** Größe des Auswahl-Dialogs (Dialog-Primitive size-Prop, Standard: „full"). */
  dialogSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Placeholder shown on the trigger when no value is selected. */
  placeholder?: string;
  /** Placeholder text of the filter input. */
  searchPlaceholder?: string;
  /** Message shown when the filtered list is empty. */
  emptyLabel?: string;
  disabled?: boolean;
  /** Custom trigger node rendered inside the popover trigger. */
  trigger?: (value: string | null) => ReactNode;
  /**
   * Optionaler ObjectStore-Key-Prefix (Ordner), z.B. "profile/". Wenn gesetzt,
   * erscheint im Dialog ein "Hochladen"-Button: Die Datei wird über den
   * zentralen Asset-Upload-Endpoint hochgeladen, die Liste anschließend neu
   * geladen und das neue Asset hervorgehoben.
   */
  uploadPrefix?: string;
  /**
   * Optionaler Default-Ordner-Filter (z.B. "portfolio"), der beim Öffnen
   * vorausgewählt wird. Ohne Angabe wird der erste Segment von `uploadPrefix`
   * verwendet (z.B. "portfolio/ai" → "portfolio"); ohne beides → "Alle".
   * Der Nutzer kann im Dialog über ein Ordner-Dropdown auf "Alle" oder andere
   * (aus den geladenen Assets abgeleitete) Ordner wechseln.
   */
  prefix?: string;
}
