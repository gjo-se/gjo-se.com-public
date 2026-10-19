import Button from '@src/components/primitives/Button';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { localePath } from '@src/lib/locale';
import { useContent } from '@src/providers/siteContent/useContent';
import { route } from '@src/router.derived';

import { cookieBannerVariants } from './CookieBanner.variants';

export interface CookieBannerProps {
  isVisible: boolean
  onDismiss: () => void
}
/**
 * CookieBanner – transparenter Hinweis zur lokalen Speicherung.
 *
 * Es werden keine Cookies zu Analyse- oder Werbezwecken gesetzt und nichts, wozu
 * eine Einwilligung erforderlich wäre – der Hinweis informiert nur und lässt sich
 * bestätigen. Texte via `cookie.*`-Content-Keys (DE/EN). No className prop –
 * Styling exclusively via isVisible/onDismiss.
 */
export default function CookieBanner({ isVisible, onDismiss }: CookieBannerProps) {
  const { lang } = useLanguage();
  const { data } = useContent(lang);

  if (!isVisible) return null;

  const title = data['cookie.title'] ?? 'Cookie-Hinweis';
  const description = data['cookie.description'] ?? 'Es werden keine Cookies zu Analyse- oder Werbezwecken gesetzt.';
  const accept = data['cookie.accept'] ?? 'Verstanden';
  const linkLabel = data['cookie.link'] ?? 'Datenschutzerklärung';

  return (
    <div
      role="region"
      aria-label={title}
      className={cookieBannerVariants()}
    >
      <div className="mb-1">
        <Text variant="label" weight="semibold">
          {title}
        </Text>
      </div>
      <div className="mb-4">
        <Text variant="caption" color="muted">
          {description}
        </Text>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="default" size="sm" onClick={onDismiss}>{accept}</Button>
        <Link to={localePath(route.privacy, lang)} size="sm" variant="muted">
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}

export type { CookieBannerVariants } from './CookieBanner.variants';
