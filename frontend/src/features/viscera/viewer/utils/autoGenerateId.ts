/**
 * Generates a URL-safe object ID from a display name.
 * "My Service" → "my-service"
 */
export function autoGenerateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}
