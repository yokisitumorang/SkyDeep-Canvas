import { create } from 'zustand';
import type { ArchitectureElement } from '@/types/c4';
import type { C4Level } from '@/types/c4';
import type { ParseError } from '@/types/parser';

import { MarkerType } from 'reactflow';

/** Maps a C4 level to the next level down */
const NEXT_LEVEL: Record<string, C4Level | undefined> = {
  L1: 'L2',
  L2: 'L3',
  L3: 'L4',
};

/** Maps a C4 level to the corresponding C4 type */
const LEVEL_TO_TYPE: Record<C4Level, string> = {
  L1: 'system',
  L2: 'container',
  L3: 'component',
  L4: 'code',
};

/** A sub-canvas navigation entry */
export interface SubCanvasEntry {
  parentId: string;   // The node whose children are displayed
  label: string;      // Display name for tabs and breadcrumbs
}

/** A breadcrumb entry representing a navigation level in the drill-down stack */
export interface NavigationEntry {
  level: C4Level;
  parentId: string | null;
  label: string;
}

/** React Flow node shape used by the store */
export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  parentId?: string;
  extent?: 'parent';
  style?: Record<string, unknown>;
  selected?: boolean;
}

/** React Flow edge shape used by the store */
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  data?: Record<string, unknown>;
  animated?: boolean;
  style?: Record<string, unknown>;
  markerEnd?: string | { type: MarkerType; width?: number; height?: number; color?: string };
  markerStart?: string | { type: MarkerType; width?: number; height?: number; color?: string };
}

export interface DiagramState {
  // Workspace
  fileHandle: FileSystemFileHandle | null;
  workspaceName: string | null;
  allElements: ArchitectureElement[];
  parseErrors: ParseError[];

  // Canvas
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  activeLevel: C4Level;
  navigationStack: NavigationEntry[];

  // Viewport
  viewport: { x: number; y: number; zoom: number };

  // Sub-canvas navigation
  subCanvasStack: SubCanvasEntry[];
  sheetViewports: Record<string, { x: number; y: number; zoom: number }>;

  /** Per-sheet saved visual state (nodes and edges) — runtime only, not persisted */
  sheetNodeData: Record<string, { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }>;
}

export interface DiagramActions {
  // Workspace actions
  setFileHandle(handle: FileSystemFileHandle, name: string): void;
  setElements(elements: ArchitectureElement[], errors: ParseError[]): void;

  // Navigation actions
  drillDown(nodeId: string): void;
  navigateToBreadcrumb(index: number): void;

  // Sub-canvas navigation actions
  navigateToSubCanvas(nodeId: string): void;
  navigateToSheet(index: number): void;
  navigateToRoot(): void;

  // Element CRUD
  addElement(element: ArchitectureElement): void;
  updateElement(id: string, updates: Partial<ArchitectureElement>): void;
  removeElement(id: string): void;

  // Canvas state
  setNodes(nodes: ReactFlowNode[]): void;
  setEdges(edges: ReactFlowEdge[]): void;
  setViewport(viewport: { x: number; y: number; zoom: number }): void;
}

export type DiagramStore = DiagramState & DiagramActions;

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  // Initial state
  fileHandle: null,
  workspaceName: null,
  allElements: [],
  parseErrors: [],
  nodes: [],
  edges: [],
  activeLevel: 'L1' as C4Level,
  navigationStack: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  subCanvasStack: [],
  sheetViewports: {},
  sheetNodeData: {},

  // Workspace actions
  setFileHandle(handle: FileSystemFileHandle, name: string) {
    set({ fileHandle: handle, workspaceName: name });
  },

  setElements(elements: ArchitectureElement[], errors: ParseError[]) {
    set({ allElements: elements, parseErrors: errors });
  },

  // Navigation actions
  drillDown(nodeId: string) {
    const { allElements, activeLevel, navigationStack } = get();

    const element = allElements.find((el) => el.id === nodeId);
    if (!element) return;

    const nextLevel = NEXT_LEVEL[activeLevel];
    if (!nextLevel) return; // Already at L4, can't drill deeper

    // Push current level to navigation stack
    const entry: NavigationEntry = {
      level: activeLevel,
      parentId: nodeId,
      label: element.name,
    };

    set({
      activeLevel: nextLevel,
      navigationStack: [...navigationStack, entry],
    });
  },

  navigateToBreadcrumb(index: number) {
    const { navigationStack } = get();

    // Guard: if index is out of range, navigate to root
    if (index < 0 || index >= navigationStack.length) {
      set({
        activeLevel: 'L1' as C4Level,
        navigationStack: [],
      });
      return;
    }

    const entry = navigationStack[index];
    // Slice the stack to the given index (exclusive — we navigate TO that entry's level)
    // The entry at `index` represents the level we came FROM, so the active level
    // after navigating to breadcrumb[index] should be the next level after entry.level
    // Actually, the breadcrumb represents where we were before drilling down.
    // navigateToBreadcrumb(index) means "go back to the state at that breadcrumb".
    // The entry.level is the level that was active when we drilled down from it.
    // So restoring to breadcrumb[index] means activeLevel = entry.level,
    // and the stack is sliced to [0..index) (everything before this entry).
    set({
      activeLevel: entry.level,
      navigationStack: navigationStack.slice(0, index),
    });
  },

  // Sub-canvas navigation actions
  navigateToSubCanvas(nodeId: string) {
    const { allElements, subCanvasStack, sheetViewports, viewport, nodes, edges, sheetNodeData } = get();

    const element = allElements.find((el) => el.id === nodeId);
    if (!element) return;

    // Determine the active sheet key for saving the current viewport and node data
    const activeSheetKey =
      subCanvasStack.length === 0
        ? 'root'
        : subCanvasStack[subCanvasStack.length - 1].parentId;

    // Save current viewport under the active sheet key
    const updatedSheetViewports = {
      ...sheetViewports,
      [activeSheetKey]: { ...viewport },
    };

    // Save current nodes and edges under the active sheet key
    const updatedSheetNodeData = {
      ...sheetNodeData,
      [activeSheetKey]: { nodes, edges },
    };

    // Push a new SubCanvasEntry onto the stack
    const newEntry: SubCanvasEntry = {
      parentId: nodeId,
      label: element.name,
    };
    const updatedStack = [...subCanvasStack, newEntry];

    // Restore the target sheet's viewport if it exists, otherwise use default
    const targetViewport = updatedSheetViewports[nodeId] ?? {
      x: 0,
      y: 0,
      zoom: 1,
    };

    // Restore the target sheet's nodes and edges if they exist, otherwise empty
    const targetNodeData = updatedSheetNodeData[nodeId];

    set({
      subCanvasStack: updatedStack,
      sheetViewports: updatedSheetViewports,
      sheetNodeData: updatedSheetNodeData,
      viewport: targetViewport,
      nodes: targetNodeData?.nodes ?? [],
      edges: targetNodeData?.edges ?? [],
    });
  },

  navigateToSheet(index: number) {
    const { subCanvasStack, sheetViewports, viewport, nodes, edges, sheetNodeData } = get();

    // Guard: out-of-range index navigates to root
    if (index < -1 || index >= subCanvasStack.length) {
      return get().navigateToSheet(-1);
    }

    // Save current viewport under the active sheet key
    const activeSheetKey =
      subCanvasStack.length === 0
        ? 'root'
        : subCanvasStack[subCanvasStack.length - 1].parentId;

    const updatedSheetViewports = {
      ...sheetViewports,
      [activeSheetKey]: { ...viewport },
    };

    // Save current nodes and edges under the active sheet key
    const updatedSheetNodeData = {
      ...sheetNodeData,
      [activeSheetKey]: { nodes, edges },
    };

    // Truncate the stack: index -1 clears entirely, otherwise keep entries 0..index
    const updatedStack = index === -1 ? [] : subCanvasStack.slice(0, index + 1);

    // Determine the target sheet key for viewport restoration
    const targetSheetKey =
      updatedStack.length === 0
        ? 'root'
        : updatedStack[updatedStack.length - 1].parentId;

    // Restore the target sheet's viewport if it exists, otherwise use default
    const targetViewport = updatedSheetViewports[targetSheetKey] ?? {
      x: 0,
      y: 0,
      zoom: 1,
    };

    // Restore the target sheet's nodes and edges if they exist, otherwise empty
    const targetNodeData = updatedSheetNodeData[targetSheetKey];

    set({
      subCanvasStack: updatedStack,
      sheetViewports: updatedSheetViewports,
      sheetNodeData: updatedSheetNodeData,
      viewport: targetViewport,
      nodes: targetNodeData?.nodes ?? [],
      edges: targetNodeData?.edges ?? [],
    });
  },

  navigateToRoot() {
    get().navigateToSheet(-1);
  },

  // Element CRUD
  addElement(element: ArchitectureElement) {
    set((state) => ({
      allElements: [...state.allElements, element],
    }));
  },

  updateElement(id: string, updates: Partial<ArchitectureElement>) {
    set((state) => ({
      allElements: state.allElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  removeElement(id: string) {
    set((state) => ({
      allElements: state.allElements.filter((el) => el.id !== id),
    }));
  },

  // Canvas state
  setNodes(nodes: ReactFlowNode[]) {
    set({ nodes });
  },

  setEdges(edges: ReactFlowEdge[]) {
    set({ edges });
  },

  setViewport(viewport: { x: number; y: number; zoom: number }) {
    set({ viewport });
  },
}));

// Selector hooks for minimal re-renders
export const useNodes = () => useDiagramStore((s) => s.nodes);
export const useEdges = () => useDiagramStore((s) => s.edges);
export const useActiveLevel = () => useDiagramStore((s) => s.activeLevel);
export const useNavigationStack = () => useDiagramStore((s) => s.navigationStack);
export const useViewport = () => useDiagramStore((s) => s.viewport);
export const useAllElements = () => useDiagramStore((s) => s.allElements);
export const useParseErrors = () => useDiagramStore((s) => s.parseErrors);
export const useSubCanvasStack = () => useDiagramStore((s) => s.subCanvasStack);
export const useSheetViewports = () => useDiagramStore((s) => s.sheetViewports);
