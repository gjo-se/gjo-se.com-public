/**
 * Fetches a YAML file from the given path and returns its raw text content.
 * No YAML parsing is performed – parsing is handled by useYamlValidation / LivePreview.
 */
export async function fetchYamlFile(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}
