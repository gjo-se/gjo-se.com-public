/**
 * ProjectCardGridItem – Grid-Adapter für die PortfolioPage.
 *
 * Der Grid-Organism übergibt `item`, ProjectCard erwartet aber `project` +
 * `streamUrl`. Dieser Adapter verbindet beides und holt den Stream-URL-Builder
 * lokal aus dem Portfolio-Service, damit die Komponenten-Identität über
 * Renders hinweg stabil bleibt.
 */
import { usePortfolioService } from '../../hooks/usePortfolioService';
import ProjectCard from '../project-card/ProjectCard';

import type { PortfolioListItem } from '../../core/types';

/** Props for `ProjectCardGridItem`. */
interface ProjectCardGridItemProps {
  /** Ein Listeneintrag, den der Grid-Organism als `item` übergibt. */
  item: PortfolioListItem;
}
/**
 * Rendert eine ProjectCard innerhalb des generischen Grid-Organisms.
 */
export default function ProjectCardGridItem({ item }: ProjectCardGridItemProps) {
  const { getStreamUrl } = usePortfolioService();
  return <ProjectCard project={item} streamUrl={getStreamUrl} />;
}
