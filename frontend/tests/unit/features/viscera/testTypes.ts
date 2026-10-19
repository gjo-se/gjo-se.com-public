/**
 * Local structural stand-ins for elkjs graph nodes used in assertions.
 *
 * They keep the tests free of elkjs' full type surface while describing the
 * only fields the mapper reads (`id` + nested `children`).
 */

export interface ElkLikeNode {
  id: string;
  children?: ElkLikeNode[];
}
