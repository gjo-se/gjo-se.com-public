/**
 * Hook: useEntityDetail
 *
 * Generisches Data-Fetching + Field-Mapping für Detail-Seiten.
 * Eliminiert Duplikate zwischen useFreelancermapDetail und useProjectDetail.
 */
import { useEffect, useState } from 'react';

import type { FieldEntry } from '../core/types';

export interface UseEntityDetailConfig<T> {
  /** Route param (string | undefined) – wird zu number gecastet. */
  id: string | undefined
  /** Service-Aufruf zum Laden der Entität. */
  fetchFn: (id: number) => Promise<T>
  /** Baut das Field-Array für die Detail-Ansicht. */
  buildFields: (entity: T) => FieldEntry[]
  /** Fehlermeldung bei fehlgeschlagenem Fetch. */
  errorMessage?: string
}

export interface UseEntityDetailResult<T> {
  entity: T | null
  fields: FieldEntry[]
  loading: boolean
  error: string | null
}

/**
 * Generischer Hook für Entity-Detail-Views.
 * Lädt eine Entität per ID und baut ein Field-Array für die Darstellung.
 */
export function useEntityDetail<T>(config: UseEntityDetailConfig<T>): UseEntityDetailResult<T> {
  const { id, fetchFn, buildFields, errorMessage = 'Nicht gefunden.' } = config;

  const [entity, setEntity] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetchFn(Number(id))
      .then(setEntity)
      .catch(() => setError(errorMessage))
      .finally(() => setLoading(false));
  }, [id, fetchFn, buildFields, errorMessage]);

  const fields = entity ? buildFields(entity) : [];

  return { entity, fields, loading, error };
}
