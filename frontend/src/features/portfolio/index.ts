/**
 * Portfolio-Feature-Barrel – öffentliche API des Features.
 */
export { usePortfolioAdminTable } from './hooks/usePortfolioAdminTable';
export type { PortfolioAdminRow, UsePortfolioAdminTableResult } from './hooks/usePortfolioAdminTable';
export { default as PortfolioAdminTable } from './components/portfolio-admin-table/PortfolioAdminTable';
export type { PortfolioAdminTableProps } from './components/portfolio-admin-table/PortfolioAdminTable';
export { usePortfolioAdminDetail } from './hooks/usePortfolioAdminDetail';
export { useProofSubTable } from './hooks/useProofSubTable';
export type { UseProofSubTableResult } from './hooks/useProofSubTable';
export { default as ProofSubTable } from './components/proof-sub-table/ProofSubTable';
export type { ProofSubTableProps } from './components/proof-sub-table/ProofSubTable';
export { TranslationFields } from './components/translation/TranslationFields';
export { default as ImageSrcCell } from './components/proof-sub-table/ImageSrcCell';

// ── Public FE ─────────────────────────────────────────────────────────────────

export type { PortfolioListItem, PortfolioDetail, Proof } from './core/types';
export { usePortfolioService } from './hooks/usePortfolioService';
export { useHomeFocusCards } from './hooks/useHomeFocusCards';
export { default as ProjectCard } from './components/project-card/ProjectCard';
export type { ProjectCardProps } from './components/project-card/ProjectCard';
export { default as ProjectCardGridItem } from './components/project-card-grid-item/ProjectCardGridItem';
export { default as ProjectFeature } from './components/project-feature/ProjectFeature';
export type { ProjectFeatureProps } from './components/project-feature/ProjectFeature';
export { default as ProjectChain } from './components/project-chain/ProjectChain';
export type { ProjectChainProps } from './components/project-chain/ProjectChain';
export { default as ProofCard } from './components/proof-card/ProofCard';
export type { ProofCardProps } from './components/proof-card/ProofCard';
export { default as ProofGrid } from './components/proof-grid/ProofGrid';
export type { ProofGridProps } from './components/proof-grid/ProofGrid';
export { default as ProofLightbox } from './components/proof-lightbox/ProofLightbox';
export type { ProofLightboxProps } from './components/proof-lightbox/ProofLightbox';
export { default as PortfolioHero } from './components/portfolio-hero/PortfolioHero';
export type { PortfolioHeroProps } from './components/portfolio-hero/PortfolioHero';
