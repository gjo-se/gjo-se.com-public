import Text from '@src/components/primitives/Text';

import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

/** Labeled, recessed panel that groups related fields and separates them from the dialog surface. */
export default function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-border bg-background/60 p-4">
      <div className="mb-3">
        <Text as="h4" variant="h6">
          {title}
        </Text>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
