import type { ProjectFreelancerMap } from '@src/lib/api/aiscope';

import type { DetailProject } from './ProjectDetailView.types';

export function isFreelancerMap(p: DetailProject): p is ProjectFreelancerMap {
  return 'skills' in p || 'mapped_at' in p;
}
