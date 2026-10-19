import BreadcrumbItem from '@src/components/primitives/Breadcrumb/BreadcrumbItem';
import BreadcrumbList from '@src/components/primitives/Breadcrumb/BreadcrumbList';
import BreadcrumbPage from '@src/components/primitives/Breadcrumb/BreadcrumbPage';
import BreadcrumbSeparator from '@src/components/primitives/Breadcrumb/BreadcrumbSeparator';
import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';
import { resolveActiveDiagram } from '@src/features/viscera/core/derivedDiagram';
import type { Diagram, Workspace } from '@src/features/viscera/core/workspaceSchema';
import { useViewState } from '@src/features/viscera/hooks/useViewState';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

const SYSTEM_CONTEXT_KEY = 'SystemContext';
const SYSTEM_CONTEXT_LABEL = 'SystemContext';

export interface BreadcrumbProps {
  /**
   * Display name of the current system (Level 2).
   * Undefined when the viewer is in SystemContext view.
   * Falls back to the workspace diagram name or currentViewKey.
   */
  systemName?: string;
  /**
   * Display name of the detail diagram (Level 3, e.g. "LLM Pipeline (D2)").
   * Undefined when no detail diagram is open.
   */
  detailDiagramName?: string;
  /**
   * Display name of the module diagram (Level 4). When set, the breadcrumb
   * renders a fourth segment: `… > Component > Module`.
   */
  moduleDiagramName?: string;
  /**
   * Optional workspace for deriving view display names from `workspace.diagrams`.
   * When provided, view keys are resolved to their diagram names.
   */
  workspace?: Workspace | null;
}

/**
 * Breadcrumb navigation for the Viscera.
 *
 * Shows the hierarchy:
 * - Level 1 only: ``SystemContext``
 * - Level 2: ``SystemContext > <SystemName>``
 * - Level 3: ``SystemContext > <SystemName> > <DetailDiagramName>``
 * - Level 4: ``SystemContext > <SystemName> > <Component> > <Module>``
 *
 * Clickable segments navigate back via ``useViewState()``.
 * View display names are derived from ``workspace.diagrams`` when available.
 */
export default function Breadcrumb({ systemName, detailDiagramName, moduleDiagramName, workspace }: BreadcrumbProps) {
  const { currentViewKey, setViewKey } = useViewState();
  const isLandscape = currentViewKey === SYSTEM_CONTEXT_KEY;

  // Ephemeres derived-Diagramm (L3/L4) – Label-Auflösung für lazy Views (#2491).
  const derivedDiagram = useVisceraStore((s) => s.derivedDiagram);
  const activeDiagram = resolveActiveDiagram(workspace ?? null, currentViewKey, derivedDiagram);
  const isDerived =
    !!activeDiagram && !(workspace?.diagrams ?? []).some((d) => d.key === currentViewKey);
  const derivedName = isDerived ? activeDiagram?.name : undefined;

  // L4 chain (module → component → system) resolved from the workspace, or
  // from the explicit `moduleDiagramName` prop when set, or from a derived L4 view.
  const moduleChain = moduleDiagramName
    ? buildModuleChain(moduleDiagramName, currentViewKey)
    : buildModuleChainFromWorkspace(currentViewKey, workspace)
      ?? (isDerived && activeDiagram?.type === 'module' && activeDiagram.parent
        ? {
            system: SYSTEM_CONTEXT_LABEL,
            systemKey: undefined,
            component: activeDiagram.parent,
            componentKey: activeDiagram.parent,
            module: activeDiagram.name,
          }
        : null);

  // ── Level 1 only ──────────────────────────────────────────────────────
  if (isLandscape && !moduleChain && !detailDiagramName) {
    return (
      <nav aria-label="Breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>
              <Text weight="semibold" size="sm">{SYSTEM_CONTEXT_LABEL}</Text>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </nav>
    );
  }

  const displayName = systemName ?? resolveViewName(currentViewKey, workspace, derivedName);

  // ── Level 4: SystemContext > System > Component > Module ──────────────
  if (moduleChain) {
    return (
      <nav aria-label="Breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Button variant="link" size="sm" onClick={() => setViewKey(SYSTEM_CONTEXT_KEY)}>
              {SYSTEM_CONTEXT_LABEL}
            </Button>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Button variant="link" size="sm" onClick={() => setViewKey(moduleChain.systemKey ?? currentViewKey)}>
              {moduleChain.system}
            </Button>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Button variant="link" size="sm" onClick={() => setViewKey(moduleChain.componentKey)}>
              {moduleChain.component}
            </Button>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <Text weight="semibold" size="sm">{moduleChain.module}</Text>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </nav>
    );
  }

  // ── Level 2: SystemContext > View ────────────────────────────────────
  if (!detailDiagramName) {
    return (
      <nav aria-label="Breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Button variant="link" size="sm" onClick={() => setViewKey(SYSTEM_CONTEXT_KEY)}>
              {SYSTEM_CONTEXT_LABEL}
            </Button>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <Text weight="semibold" size="sm">{displayName}</Text>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </nav>
    );
  }

  // ── Level 3: SystemContext > View > DetailDiagram ────────────────────
  return (
    <nav aria-label="Breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <Button variant="link" size="sm" onClick={() => setViewKey(SYSTEM_CONTEXT_KEY)}>
            {SYSTEM_CONTEXT_LABEL}
          </Button>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <Button variant="link" size="sm" onClick={() => setViewKey(currentViewKey)}>
            {displayName}
          </Button>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            <Text weight="semibold" size="sm">{detailDiagramName}</Text>
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </nav>
  );
}

/** Builds the L4 chain when the module name is passed explicitly. */
function buildModuleChain(
  moduleName: string,
  moduleKey: string,
): { system: string; systemKey?: string; component: string; componentKey: string; module: string } {
  return {
    system: SYSTEM_CONTEXT_LABEL,
    systemKey: undefined,
    component: moduleKey,
    componentKey: moduleKey,
    module: moduleName,
  };
}

/**
 * Builds the L4 chain from the workspace when the current view is a module
 * diagram. Resolves `module → component → system` via the `parent` references.
 */
function buildModuleChainFromWorkspace(
  currentViewKey: string,
  workspace?: Workspace | null,
): { system: string; systemKey?: string; component: string; componentKey: string; module: string } | null {
  const diagrams = (workspace?.diagrams ?? []) as Diagram[];
  const moduleDiagram = diagrams.find((d) => d.key === currentViewKey);
  if (moduleDiagram?.type !== 'module' || !moduleDiagram.parent) return null;

  const componentDiagram = diagrams.find((d) => d.key === moduleDiagram.parent);
  const component = componentDiagram?.name ?? moduleDiagram.parent;

  let system = SYSTEM_CONTEXT_LABEL;
  let systemKey: string | undefined;
  if (componentDiagram?.parent) {
    const systemDiagram = diagrams.find((d) => d.key === componentDiagram.parent);
    if (systemDiagram) {
      system = systemDiagram.name;
      systemKey = systemDiagram.key;
    }
  }

  return {
    system,
    systemKey,
    component,
    componentKey: moduleDiagram.parent,
    module: moduleDiagram.name,
  };
}

/**
 * Resolve a view key to its display name from workspace.diagrams.
 * Falls back to the derived diagram name, then the key itself.
 */
function resolveViewName(viewKey: string, workspace?: Workspace | null, derivedName?: string): string {
  const diagrams = (workspace?.diagrams ?? []) as Diagram[];
  return diagrams.find((d) => d.key === viewKey)?.name ?? derivedName ?? viewKey;
}
