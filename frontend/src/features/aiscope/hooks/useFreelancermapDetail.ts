/**
 * Hook: useFreelancermapDetail
 *
 * Data-Fetching + Field-Mapping für die Freelancermap-Detail-Seite.
 * Nutzt den generischen useEntityDetail-Hook und denselben Field-Builder wie
 * der Renderer (ProjectDetailView) – eine Quelle, kein Drift.
 */
import { buildFreelancermapFields } from '@src/components/organisms/ProjectDetailView/ProjectFields.utils';
import {
  fetchFreelancermapProject,
  type ProjectFreelancerMap,
} from '@src/lib/api/aiscope';

import { useEntityDetail, type UseEntityDetailResult } from './useEntityDetail';

export type { UseEntityDetailResult as UseFreelancermapDetailResult };

/** Fetches a single Freelancermap project by ID and builds a field array for the detail view. */
export function useFreelancermapDetail(id: string | undefined): UseEntityDetailResult<ProjectFreelancerMap> {
  return useEntityDetail({
    id,
    fetchFn: fetchFreelancermapProject,
    buildFields: buildFreelancermapFields,
    errorMessage: 'Projekt nicht gefunden.',
  });
}
