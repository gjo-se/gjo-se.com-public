import PageHeader from '@src/components/molecules/PageHeader/PageHeader';
import Container from '@src/components/primitives/Container';
import LoadingShell from '@src/components/primitives/LoadingShell';
import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { useContent } from '@src/providers/siteContent/useContent';
import { useStateTexts } from '@src/providers/siteContent/useStateTexts';
import { route } from '@src/router.derived';

import type { LegalSlug } from './LegalPage.types';

export interface LegalPageProps {
  slug: LegalSlug;
}

/**
 * LegalPage – gemeinsame Legal-Seite für imprint/privacy/terms.
 * Lädt den Markdown-Inhalt aus `legal.{slug}.body` (core_site_content, DE/EN)
 * und den Titel aus `legal.{slug}.title` (Fallback: Router-Label).
 */
export default function LegalPage({ slug }: LegalPageProps) {
  const { lang } = useLanguage();
  const { data, loading, error } = useContent(lang);
  const texts = useStateTexts();

  const routeLabel = route[slug];
  const title = data[`legal.${slug}.title`] ?? (lang === 'en' ? routeLabel?.labelEn ?? routeLabel?.label ?? slug : routeLabel?.label ?? slug);
  const body = data[`legal.${slug}.body`];

  return (
    <section className="pt-intro-top pb-section-legal">
      {/* Kopf-Art „links, schlicht" (PageHeader) → Inhalt auf der Grid-Kante, Lesemaß statt Vollbreite. */}
      <Container size="content">
        <PageHeader title={title} appearance="public" />
        {loading ? (
          <LoadingShell height="py-8" text={texts.loading} />
        ) : error ? (
          <Text color="muted">{texts.errorDescription}</Text>
        ) : body ? (
          <Markdown variant="legal">{body}</Markdown>
        ) : (
          <Text color="muted">{texts.empty}</Text>
        )}
      </Container>
    </section>
  );
}
