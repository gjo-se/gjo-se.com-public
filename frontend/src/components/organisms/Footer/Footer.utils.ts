export const currentYear = new Date().getFullYear();

/** Ersetzt den {year}-Platzhalter im pflegbaren Copyright-Text. */
export function copyrightText(template: string, year: number): string {
  return template.replace('{year}', String(year));
}
