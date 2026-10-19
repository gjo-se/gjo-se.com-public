import { Link as RouterLink } from 'react-router';

import Icon from '@src/components/primitives/Icon';
import { cn } from '@src/lib/utils';

import { linkVariants } from './Link.variants';

import type { LinkProps } from './Link.interface';

/**
 * Link – Styled navigation link with React Router, hash anchor, and external link support.
 */
export default function Link({
  to,
  href,
  hash,
  variant = 'default',
  size = 'md',
  external = false,
  underline = false,
  'aria-label': ariaLabel,
  title,
  onClick,
  children,
}: LinkProps) {
  const routePath = typeof to === 'object' ? to.path : to;
  const routeLabel = typeof to === 'object' ? to.label : undefined;

  if (import.meta.env.DEV && href && href.startsWith('/') && !routePath && !hash) {
    console.warn(
      `[Link] Internal path via href="${href}" causes full page reload. ` +
      `Use to="${href}" instead (React Router SPA navigation).`,
    );
  }

  const baseClass = cn(linkVariants({ variant, size }), underline && 'underline underline-offset-2');

  // CTA-Links bekommen einen persistenten Pfeil (auch ohne Hover erkennbar) –
  // die Komponente hängt ihn an, damit die Affordance überall identisch ist.
  const content = (
    <>
      {children ?? routeLabel}
      {variant === 'cta' && (
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-150 group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </>
  );

  if (hash) {
    return (
      <a href={hash} className={baseClass} aria-label={ariaLabel} title={title} onClick={onClick}>
        {content}
      </a>
    );
  }

  if (routePath) {
    return (
      <RouterLink to={routePath} className={baseClass} aria-label={ariaLabel} title={title} onClick={onClick}>
        {content}
      </RouterLink>
    );
  }

  return (
    <a
      href={href}
      className={baseClass}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
    >
      {content}
      {external && <Icon name="external-link" size="xs" aria-hidden />}
    </a>
  );
}
