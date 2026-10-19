import Container from '@src/components/primitives/Container';
import Icon from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';
import Logo from '@src/components/primitives/Logo';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { localeLabel, localePath } from '@src/lib/locale';
import { useApplicationProfile } from '@src/providers/applicationProfile/useApplicationProfile';
import { useContent } from '@src/providers/siteContent/useContent';
import { footerLinks, route } from '@src/router.derived';

import { copyrightText, currentYear } from './Footer.utils';

/**
 * Footer – Container: page footer with legal links, social icons, copyright.
 * Copyright-Text via footer.*-Content-Key (DE/EN), Social-Icons nur LinkedIn + GitHub.
 */
export default function Footer() {
  const { lang } = useLanguage();
  const { data } = useContent(lang);
  const { profile } = useApplicationProfile();

  const socialLinks = [
    { icon: 'github' as const, href: profile?.githubUrl ?? '', label: 'GitHub' },
    { icon: 'linkedin' as const, href: profile?.linkedinUrl ?? '', label: 'LinkedIn' },
  ].filter((link) => link.href.length > 0);

  const copyright = copyrightText(data['footer.copyright'] ?? '© {year} gjo-se.com', currentYear);

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container size="wide" padded>
        <div className="flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to={route.home} aria-label="gjo:Se">
              <Logo variant="favicon" size="sm" />
            </Link>
            <Text size="sm" color="muted">{copyright}</Text>
          </div>
          <nav className="flex items-center gap-4" aria-label="Rechtliches">
            {footerLinks.map((link) => (
              <Link
                key={link.path}
                to={{ ...link, path: localePath(link, lang), label: localeLabel(link, lang) }}
                size="sm"
                variant="muted"
              />
          ))}
          </nav>
          <div className="flex items-center gap-2">
            {socialLinks.map(({ icon, href, label }) => (
              <Link key={icon} href={href} external variant="muted" aria-label={label}>
                <Icon name={icon} size="sm" aria-hidden />
              </Link>
          ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
