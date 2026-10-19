import Text from '@src/components/primitives/Text';

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /**
   * Kopf-Typografie:
   * - `admin` (Default): Sans, weight 700 – für Admin-/Tool-Seiten.
   * - `public`: Display-Serif (`Text variant="display"`), identisch zum H1 der
   *   öffentlichen Seiten (`PageIntro`) – für schlichte öffentliche Inhaltsseiten.
   */
  appearance?: 'admin' | 'public'
}
/**
 * PageHeader – Standardisierter Seitenkopf mit h1 und optionaler Unterzeile.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <PageHeader title="Portfolio" subtitle="Ausgewählte Projekte und Fallstudien." />
 * <PageHeader title="Impressum" appearance="public" />
 */
export default function PageHeader({ title, subtitle, appearance = 'admin' }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <Text as="h1" variant={appearance === 'public' ? 'display' : 'h1'}>
        {title}
      </Text>
      {subtitle && (
        <div className="mt-2">
          <Text color="muted">{subtitle}</Text>
        </div>
      )}
    </div>
  );
}
