import Text from '@src/components/primitives/Text';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  id?: string;
}

/** `//`-eyebrow + H2 section heading (baseline-aligned). */
export default function SectionHeading({ eyebrow, title, id }: SectionHeadingProps) {
  return (
    <div className="mb-12 flex items-baseline gap-4">
      {eyebrow && (
        <div className="shrink-0">
          <Text as="span" variant="eyebrow">{eyebrow}</Text>
        </div>
      )}
      <Text
        as="h2"
        id={id}
        variant="title"
      >
        {title}
      </Text>
    </div>
  );
}
