import Text from '@src/components/primitives/Text';

import { detailSectionContainerVariants, detailSectionHeaderVariants } from './DetailSection.variants';

import type { DetailSectionProps } from './DetailSection.interface';

/**
 * DetailSection – DetailTable-consistent bordered card with a muted header.
 *
 * Used by the admin detail pages (ApplicationProfile, Company) for 1:N child
 * sections that render a table or a list below a header. Replaces the
 * copy-pasted `CONTAINER`/`HEADER` token blocks on those pages.
 */
export default function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section>
      <div className={detailSectionContainerVariants()}>
        <div className={detailSectionHeaderVariants()}>
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            {title}
          </Text>
        </div>
        {children}
      </div>
    </section>
  );
}

export type { DetailSectionVariants } from './DetailSection.variants';
export type { DetailSectionProps } from './DetailSection.interface';
