import Chip from '@src/components/primitives/Chip';
import Separator from '@src/components/primitives/Separator';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';

import ErrorState from '../../molecules/ErrorState/ErrorState';
import Card from '../../primitives/Card';

import DetailShell from './DetailShell';
import { isFreelancerMap } from './ProjectDetailView.utils';
import { buildFreelancermapFields, buildProjectFields } from './ProjectFields.utils';

import type { DetailProject } from './ProjectDetailView.types';

export type { FieldEntry } from './ProjectFields.utils';

export interface ProjectDetailViewProps {
  project: DetailProject | null
  loading?: boolean
  error?: string | null
}


/**
 * ProjectDetailView – Read-only detail for normalised projects and raw Freelancermap entries.
 *
 * Detects the project variant (Project vs ProjectFreelancerMap) via type guard
 * and renders the appropriate field set and extra section (skills).
 */
export default function ProjectDetailView({ project, loading = false, error = null }: ProjectDetailViewProps) {
  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <ErrorState code="500" title="Ladefehler" description={error} />;
  if (!project) return null;

  if (isFreelancerMap(project)) {
    return (
      <DetailShell
        title={project.title}
        backUrl="/admin/aiscope/freelancermap"
        fields={buildFreelancermapFields(project)}
        description={project.description}
        extra={project.skills && project.skills.length > 0 ? (
          <>
            <Separator spacing="my-6" />
            <Card>
              <Text variant="h2">Skills</Text>
              <div className="flex flex-wrap gap-1.5">
                {project.skills.map((s) => <Chip key={s} variant="primary" size="sm">{s}</Chip>)}
              </div>
            </Card>
          </>
        ) : null}
      />
    );
  }

  // Skills are rendered separately in ProjectDetailPage.
  return (
    <DetailShell
      title={project.title}
      backUrl="/admin/aiscope/project"
      fields={buildProjectFields(project)}
      description={project.description}
      extra={null}
    />
  );
}
