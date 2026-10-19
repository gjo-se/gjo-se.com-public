/**
 * adrCatalogService – Katalog-Laden der ADR-Dateien.
 *
 * Trennt das parallele Batch-Laden (alle ADRs) vom Einzeldatei-I/O
 * (`adrFileService`: fetch, parse, validate pro Datei).
 */

import ADR_FILE_PATHS from 'virtual:adr-files';

import { fetchAdrFile } from './adrFileService';

import type { Adr } from './adrFileService';

/** Laedt alle ADRs parallel per HTTP (Dateien via import.meta.glob entdeckt). */
export async function loadAllAdrs(): Promise<Adr[]> {
  const results = await Promise.all(ADR_FILE_PATHS.map(fetchAdrFile));
  return results.filter((adr): adr is Adr => adr !== null);
}
