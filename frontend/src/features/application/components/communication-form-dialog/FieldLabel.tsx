import Text from '@src/components/primitives/Text';

import type { ReactNode } from 'react';

interface FieldLabelProps {
  children: ReactNode;
}

/** Uppercase micro-label used above each field (consistent across the form). */
export default function FieldLabel({ children }: FieldLabelProps) {
  return (
    <Text as="label" size="xs" weight="medium" uppercase color="muted">
      {children}
    </Text>
  );
}
