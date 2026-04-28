import { create } from 'zustand';
import type { ArchitectureElement } from '@/types/c4';
import type { C4Level } from '@/types/c4';
import type { ParseError } from '@/types/parser';

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
}

export interface DiagramActions {
  // Workspace actions
  setFileHandle(handle: FileSystemFileHandle, name: string): void;
  setElements(elements: ArchitectureElement[], errors: ParseError[]): void;

  // Navigation actions
  drillDown(nodeId: string): void;
  navigateToBreadcrumb(index: number): void;

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
