/**
 * Undo/Redo history for the diagram canvas.
 *
 * Tracks snapshots of canvas state (allElements, nodes, edges) and allows
 * stepping backward/forward through them. Viewport and navigation state
 * are intentionally excluded — undoing a zoom or drill-down would be confusing.
 *
 * Snapshots are captured on a debounced basis after store mutations,
 * skipping viewport-only changes.
 */

import { useDiagramStore } from './diagram-store';
import type { ReactFlowNode, ReactFlowEdge } from './diagram-store';
import type { ArchitectureElement } from '@/types/c4';

interface Snapshot {
  allElements: ArchitectureElement[];
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

const MAX_HISTORY = 50;

let past: Snapshot[] = [];
let future: Snapshot[] = [];
let currentSnapshot: Snapshot | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isRestoring = false;

function takeSnapshot(): Snapshot {
  const s = useDiagramStore.getState();
  return {
    allElements: s.allElements,
    nodes: s.nodes,
    edges: s.edges,
  };
}

function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  if (a.allElements === b.allElements && a.nodes === b.nodes && a.edges === b.edges) {
    return true;
  }
  return false;
}

function pushSnapshot() {
  if (isRestoring) return;

  const snap = takeSnapshot();

  // Don't push if nothing changed
  if (currentSnapshot && snapshotsEqual(currentSnapshot, snap)) return;

  if (currentSnapshot) {
    past.push(currentSnapshot);
    if (past.length > MAX_HISTORY) {
      past = past.slice(past.length - MAX_HISTORY);
    }
  }

  currentSnapshot = snap;
  // Any new action clears the redo stack
  future = [];
}

function restoreSnapshot(snap: Snapshot) {
  isRestoring = true;
  const store = useDiagramStore.getState();
  store.setElements(snap.allElements, []);
  store.setNodes(snap.nodes);
  store.setEdges(snap.edges);
  currentSnapshot = snap;
  setTimeout(() => {
    isRestoring = false;
  }, 0);
}

/** Returns 'done' if undo succeeded, 'empty' if nothing to undo. */
export function undo(): 'done' | 'empty' {
  if (past.length === 0) return 'empty';

  if (currentSnapshot) {
    future.push(currentSnapshot);
  }

  const prev = past.pop()!;
  restoreSnapshot(prev);
  return 'done';
}

/** Returns 'done' if redo succeeded, 'empty' if nothing to redo. */
export function redo(): 'done' | 'empty' {
  if (future.length === 0) return 'empty';

  if (currentSnapshot) {
    past.push(currentSnapshot);
  }

  const next = future.pop()!;
  restoreSnapshot(next);
  return 'done';
}

export function canUndo(): boolean {
  return past.length > 0;
}

export function canRedo(): boolean {
  return future.length > 0;
}

/**
 * Reset history and set the current state as the baseline.
 * Call this after loading/restoring a workspace so the empty
 * initial state is never in the undo stack.
 */
export function clearHistory() {
  past = [];
  future = [];
  currentSnapshot = takeSnapshot();
}

/**
 * Initialize history tracking. Call once on mount.
 * Returns an unsubscribe function.
 */
export function initHistory(): () => void {
  // Don't capture initial state here — it's likely empty.
  // clearHistory() should be called after the workspace loads.
  currentSnapshot = null;

  const unsub = useDiagramStore.subscribe(() => {
    if (isRestoring) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      pushSnapshot();
    }, 300);
  });

  return () => {
    unsub();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}
