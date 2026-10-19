/**
 * ImagePreviewCell – Vorschaubild (64×40px) für einen Proof-`image_src`.
 *
 * Zeigt bei leerem/fehlgeschlagenem `src` einen gedämpften Strich („–").
 * Nutzt das generische Image-Primitive (WebP-Fallback via <picture>).
 */
import Image from '@src/components/primitives/Image';
import Text from '@src/components/primitives/Text';

import { IMAGE_BOX, IMAGE_FALLBACK } from './constants';

/** Thumbnail preview for a proof image. Shows a muted dash when src is missing. */
export default function ImagePreviewCell({
  src,
  alt,
  webpSrc,
}: {
  src?: string | null;
  alt: string;
  /** Optionaler Storage-Key/URL der WebP-Variante (falls vorhanden). */
  webpSrc?: string;
}) {
  if (!src) {
    return (
      <Text size="xs" color="muted">
        –
      </Text>
    );
  }

  return (
    <div className={IMAGE_BOX}>
      <Image
        src={src}
        webpSrc={webpSrc}
        alt={alt}
        fit="cover"
        frame="none"
        fallback={(
          <div className={IMAGE_FALLBACK}>
            <Text size="xs" color="muted">
              –
            </Text>
          </div>
        )}
      />
    </div>
  );
}
