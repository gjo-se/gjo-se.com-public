import Image from '@src/components/primitives/Image';

import { entityOptionIconVariants } from './EntityOptionIcon.variants';

/** Kleines Technology-Icon vor einer EntityPicker-Option (wenn `iconUrl` gesetzt). */
export type { EntityOptionIconVariants } from './EntityOptionIcon.variants';

export default function EntityOptionIcon({
  iconUrl,
  name,
}: {
  iconUrl?: string | null;
  name: string;
}) {
  if (!iconUrl) return null;
  // `<Image>` rendert `h-full w-full`; der feste 16px-Wrapper zwingt die Größe.
  return (
    <div className={entityOptionIconVariants()}>
      <Image src={iconUrl} alt={name} fit="contain" loading="eager" />
    </div>
  );
}
