import Icon from '@src/components/primitives/Icon/Icon';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';

import { breadcrumbVariants } from './Breadcrumb.variants';

import type { BreadcrumbProps } from './Breadcrumb.interface';

/**
 * Breadcrumb – Navigation path trail.
 */
export default function Breadcrumb({ items, ...domProps }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={breadcrumbVariants()} {...domProps}>
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5 sm:gap-2.5">
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <Text variant="body" color="muted">
                {item.label}
              </Text>
            )}
            {i < items.length - 1 && (
              <span className="text-muted-foreground">
                <Icon name="chevron-right" />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
