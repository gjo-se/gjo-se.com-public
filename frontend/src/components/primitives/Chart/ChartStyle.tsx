import type { ChartStyleProps } from './ChartStyle.interface';

/**
 *
 */
export default function ChartStyle({ id, config }: ChartStyleProps) {
  const THEMES = { light: '', dark: '.dark' } as const;
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme ?? c.color);
  if (!colorConfig.length) return null;
  return (
    <style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES).map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig]) => { const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color; return color ? `  --color-${key}: ${color};` : null; }).filter(Boolean).join('\n')}
}`).join('\n') }}
    />
  );
}
