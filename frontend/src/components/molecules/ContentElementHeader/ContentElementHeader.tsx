import Text from '@src/components/primitives/Text';

export interface ContentElementHeaderProps {
  title: string
  subtitle?: string
}
/**
 * ContentElementHeader – Einheitlicher h2-Header für Content-Sektionen.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <ContentElementHeader title="Werdegang" />
 * <ContentElementHeader title="Tech Stack" subtitle="Meine Technologien" />
 */
export default function ContentElementHeader({ title, subtitle }: ContentElementHeaderProps) {
  return (
    <div className="mb-8">
      <Text variant="h2">{title}</Text>
      {subtitle && (
        <div className="mt-2">
          <Text color="muted">{subtitle}</Text>
        </div>
      )}
    </div>
  );
}
