import Text from '@src/components/primitives/Text';

import { ROW, TAG } from './constants';

/** Renders the act-2 (signal extraction) data rows. */
export default function Act2Data({ data }: { data: Record<string, unknown> }) {
  const signals = (data.signals as Record<string, unknown> | undefined) ?? {};
  const companyHints = Array.isArray(signals.company_hints) ? signals.company_hints : [];
  const productHints = Array.isArray(signals.product_hints) ? signals.product_hints : [];
  const uniquePhrases = Array.isArray(signals.unique_phrases) ? signals.unique_phrases : [];
  const techStack = typeof signals.tech_stack_summary === 'string' ? signals.tech_stack_summary : '';
  const projectContext = typeof signals.project_context === 'string' ? signals.project_context : '';

  if (companyHints.length === 0 && productHints.length === 0 && !techStack && !projectContext) {
    return <div className={ROW}><Text size="xs" color="muted">Keine Signale extrahiert.</Text></div>;
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {companyHints.length > 0 && (
        <div className={ROW}>
          <div className="flex flex-wrap gap-1 items-center">
            <Text size="xs" weight="medium" color="muted">🏢</Text>
            {companyHints.map((hint) => (
              <div key={String(hint)} className={TAG}>
                <Text as="span" size="xs" color="inherit">{String(hint)}</Text>
              </div>
            ))}
          </div>
        </div>
      )}
      {productHints.length > 0 && (
        <div className={ROW}>
          <div className="flex flex-wrap gap-1 items-center">
            <Text size="xs" weight="medium" color="muted">📦</Text>
            {productHints.map((hint) => (
              <div key={String(hint)} className={TAG}>
                <Text as="span" size="xs" color="inherit">{String(hint)}</Text>
              </div>
            ))}
          </div>
        </div>
      )}
      {uniquePhrases.length > 0 && (
        <div className={ROW}>
          <Text size="xs" color="muted">
            🔤 {uniquePhrases.map((p) => String(p)).join(' · ')}
          </Text>
        </div>
      )}
      {techStack && (
        <div className={ROW}>
          <Text size="xs" color="muted">⚙️ {techStack}</Text>
        </div>
      )}
      {projectContext && (
        <div className={ROW}>
          <Text size="xs" color="muted">📋 {projectContext}</Text>
        </div>
      )}
    </div>
  );
}
