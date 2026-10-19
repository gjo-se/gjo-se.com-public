/**
 * Core feature – Public API barrel.
 */

export * from '@src/lib/api/coreCatalog';
export { useTagDefinitionTable } from './hooks/useTagDefinitionTable';
export type { UseTagDefinitionTableResult, TagDefinitionRow } from './hooks/useTagDefinitionTable';
export { createTagColumns, CATEGORY_OPTIONS } from './shared/createTagColumns';
export { default as TagUsageSheet } from './components/tag-usage-sheet/TagUsageSheet';
export type { TagUsageSheetProps } from './components/tag-usage-sheet/TagUsageSheet';
export { useStatusDefinitionTable } from './hooks/useStatusDefinitionTable';
export type { UseStatusDefinitionTableResult, StatusDefinitionRow } from './hooks/useStatusDefinitionTable';
export { createStatusColumns, STATUS_CATEGORY_OPTIONS } from './shared/createStatusColumns';
export { buildDefinitionColumns } from './shared/BuildDefinitionColumns';
export type { DefinitionColumnOptions } from './shared/BuildDefinitionColumns';
export { default as ColorTokenCell } from './shared/ColorTokenCell';
export { default as ScopeCell } from './shared/ScopeCell';
