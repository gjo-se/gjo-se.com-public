/** An edge line between two objects. */
export interface EdgeLine {
  from: string;
  to: string;
  description?: string;
}
/** Props for the ModelViewer component. */
export interface ModelViewerProps {
  objects: NormalizedModelObject[];
  edges: EdgeLine[];
  selectedObjectId: string | null;
  /** Currently hovered object id, or null. Dispatched by parent. */
  hoveredObjectId: string | null;
  onObjectClick: (id: string) => void;
  onObjectHover: (id: string | null) => void;
  onEdgeClick: (from: string, to: string) => void;
  onToggleExpand: (id: string) => void;
  expandedIds: Set<string>;
}
/** Normalized model object for display in the ModelViewer grid. */
export interface NormalizedModelObject {
  id: string;
  name: string;
  type: 'system' | 'container' | 'component' | 'person';
  parentId?: string;
  description?: string;
  tags?: string[];
  /** Technology slugs assigned via the detail panel picker (#2331). */
  technologies?: string[];
  edgesCount: number;
  hasChildren: boolean;
}
