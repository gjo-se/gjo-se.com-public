import Avatar from '@src/components/primitives/Avatar';
import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';
import Markdown from '@src/components/primitives/Markdown/Markdown';

export interface AboutMeProps {
  name: string
  role?: string
  initials: string
  alt?: string
  photoUrl?: string | null
  paragraphs: string[]
  downloadLabel?: string
  onDownload?: () => void
}
/**
 * AboutMe – Portrait-Bereich mit Avatar, Einleitungstext und Download-Button.
 * No className prop – Styling exclusively via Props.
 *
 * @example
 * <AboutMe
 *   name="Gregory Erdmann"
 *   role="Senior Developer & Software Architect"
 *   initials="GE"
 *   photoUrl="https://example.com/photo.jpg"
 *   paragraphs={['Absatz 1', 'Absatz 2']}
 *   downloadLabel="Lebenslauf herunterladen"
 *   onDownload={() => {}}
 * />
 */
export default function AboutMe({
  name,
  role,
  initials,
  alt,
  photoUrl,
  paragraphs,
  downloadLabel,
  onDownload,
}: AboutMeProps) {
  return (
    <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
      <Avatar
        src={photoUrl ?? undefined}
        alt={alt ?? name}
        initials={initials}
        name={name}
        role={role}
        size="lg"
      />
      <div className="flex flex-col gap-3">
        {paragraphs.map((paragraph) => (
          <Markdown key={paragraph}>{paragraph}</Markdown>
        ))}
        {downloadLabel && (
          <div className="mt-2 print:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={onDownload}
              aria-label={downloadLabel}
            >
              <Icon name="download" size="sm" aria-hidden />
              {downloadLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
