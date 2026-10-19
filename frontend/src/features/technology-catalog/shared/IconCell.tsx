import { useState } from 'react';

import Image from '@src/components/primitives/Image';

import FallbackCircle from './FallbackCircle';
import { ICON_BOX } from './variants';

interface IconCellProps {
  /** Presigned/direct URL from the API response. ``null`` → show fallback immediately. */
  iconUrl: string | null;
  name: string;
  colorToken: string;
  initial: string;
  /** If false, skip ``<img>`` entirely and show fallback directly (no flicker). */
  loaded: boolean;
}

/**
 * IconCell – renders a technology icon from an ObjectStore URL with a colored-initial fallback.
 *
 * Error state auto-resets when ``iconUrl`` changes (uses ``erroredUrl`` comparison,
 * no useEffect needed). When ``loaded`` is false or ``iconUrl`` is null, the
 * colored circle fallback renders immediately.
 */
export default function IconCell({ iconUrl, name, colorToken, initial, loaded }: IconCellProps) {
  // ── Error state (auto-resets when iconUrl changes) ─────────────────────
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const errored = erroredUrl === iconUrl;

  // ── Not loaded, no URL, or load error → fallback ───────────────────────
  if (!loaded || !iconUrl || errored) {
    return <FallbackCircle colorToken={colorToken} initial={initial} title={name} />;
  }

  return (
    <div className={ICON_BOX}>
      <Image
        src={iconUrl}
        alt={name}
        fit="contain"
        loading="eager"
        onError={() => setErroredUrl(iconUrl)}
      />
    </div>
  );
}
