import { useEffect } from 'react';

import Text from '@src/components/primitives/Text';
import { cn } from '@src/lib/utils';
import { detectRuntimeEnv } from '@src/utils/runtimeEnv';

import { CONFIG, FAVICONS, PROD_FAVICON, setFavicon } from './EnvBar.utils';

/**
 * EnvBar – persistenter, farbcodierter Top-Balken + umgebungsspezifisches
 * Browser-Favicon auf non-prod-Instanzen (dev = grün, test = amber).
 *
 * Gekoppelt mit den `html.has-env-bar`-Regeln in index.css: Die Bar bleibt
 * fixed oben, das Dokument + der sticky Public-Header werden darunter
 * geschoben, sodass kein Inhalt verdeckt wird.
 * Auf prod rendert die Bar nichts und stellt das Standard-Favicon wieder her.
 */
export default function EnvBar() {
  const env = detectRuntimeEnv();
  const favicon = env === 'prod' ? PROD_FAVICON : FAVICONS[env];
  const isNonProd = env !== 'prod';

  useEffect(() => {
    document.documentElement.classList.toggle('has-env-bar', isNonProd);
    setFavicon(favicon);
    return () => document.documentElement.classList.remove('has-env-bar');
  }, [favicon, isNonProd]);

  if (env === 'prod') return null;

  const cfg = CONFIG[env];
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-env-bar flex h-(--env-bar-h) items-center justify-center gap-2 border-b uppercase',
        cfg.bar,
        cfg.border,
      )}
      role="status"
      aria-label={`Umgebung: ${cfg.label}`}
    >
      <div aria-hidden className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      <Text as="span" variant="caps" color={cfg.text}>
        {cfg.label}
      </Text>
    </div>
  );
}
