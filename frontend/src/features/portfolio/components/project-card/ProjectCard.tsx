import Image from '@src/components/primitives/Image';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { localePathname } from '@src/lib/locale';

import { THUMB, THUMB_PLACEHOLDER } from './constants';

import type { PortfolioListItem } from '../../core/types';

/** Props for `ProjectCard`. */
export interface ProjectCardProps {
  project: PortfolioListItem;
  /** Erzeugt den Bild-Stream-URL für einen Storage-Key. */
  streamUrl: (key: string) => string;
}

/**
 * ProjectCard – Molecule für einen public-Portfolio-Eintrag.
 *
 * Die gesamte Karte ist ein Link auf die Detailseite (SOTA: große Klickfläche).
 * Zeigt Thumbnail (falls vorhanden), Titel und SubTitle. Ohne `image` wird
 * eine Platzhalter-Box mit dem Projektnamen gerendert.
 */
export default function ProjectCard({ project, streamUrl }: ProjectCardProps) {
  const { title, sub_title, image, slug } = project;
  const { lang } = useLanguage();

  const thumbnail = image ? streamUrl(image) : null;
  const webpThumb = project.webpKey ? streamUrl(project.webpKey) : undefined;

  return (
    <Link
      to={localePathname(`/focus/${slug}`, lang)}
      variant="portfolio-tile"
    >
      <div className={THUMB}>
        {thumbnail ? (
          <Image src={thumbnail} webpSrc={webpThumb} alt={title} fit="cover" />
        ) : (
          <div className={THUMB_PLACEHOLDER}>
            {title}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Text variant="h3" as="h3" weight="bold">
          {title}
        </Text>
        {sub_title && (
          <Text variant="body" color="muted">
            {sub_title}
          </Text>
        )}
      </div>
    </Link>
  );
}
