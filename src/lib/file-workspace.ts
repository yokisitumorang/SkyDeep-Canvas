/**
 * Single-file workspace service.
 * Like Excalidraw, the entire workspace is stored in one `.c4.json` file.
 * Uses the File System Access API for open/save operations.
 */

import type { ArchitectureElement, C4Level } from '@/types/c4';
import type { NavigationEntry } from '@/store/diagram-store';

/** The file format version for forward compatibility */
const FILE_FORMAT_VERSION = 1;

/** File type filter for the open/save dialogs */
const FILE_TYPES = [
  {
    description: 'C4 Architecture Files',
    accept: { 'application/json': ['.c4.json'] },
  },
];

/**
 * The complete workspace file structure.
 * One file = one canvas = one workspace.
 */
export interface WorkspaceFile {
  version: number;
  name: string;
  elements: ArchitectureElement[];
  /** Saved node positions and sizes keyed by element id */
  positions: Record<string, { x: number; y: number; width?: number; height?: number }>;
  /** Saved edge styles keyed by edge id */
  edgeStyles: Record<string, { type?: string; sourceHandle?: string; targetHandle?: string }>;
  /** Saved node colors keyed by node id */
  nodeColors: Record<string, string>;
  /** Saved text node fonts keyed by node id */
  textFonts: Record<string, string>;
  /** Saved node parent relationships keyed by node id */
  nodeParents: Record<string, { parentId: string; extent?: 'parent' }>;
  viewport: { x: number; y: number; zoom: number };
  activeLevel: C4Level;
  navigationStack: NavigationEntry[];
}

/**
 * Creates a new empty workspace.
 */
export function createEmptyWorkspace(name: string): WorkspaceFile {
  return {
    version: FILE_FORMAT_VERSION,
    name,
    elements: [],
    positions: {},
    edgeStyles: {},
    nodeColors: {},
    textFonts: {},
    nodeParents: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    activeLevel: 'L1',
    navigationStack: [],
  };
}

/**
 * Serializes a workspace to a JSON string.
 */
export function serializeWorkspace(workspace: WorkspaceFile): string {
  return JSON.stringify(workspace, null, 2);
}

/**
 * Parses a JSON string into a WorkspaceFile.
 * Validates the structure and returns the workspace or throws an error.
 */
export function parseWorkspace(json: string): WorkspaceFile {
  const data = JSON.parse(json);

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object');
  }

  if (!Array.isArray(data.elements)) {
    throw new Error('Invalid file: missing elements array');
  }

  return {
    version: data.version ?? FILE_FORMAT_VERSION,
    name: data.name ?? 'Untitled',
    elements: data.elements,
    positions: data.positions ?? {},
    edgeStyles: data.edgeStyles ?? {},
    nodeColors: data.nodeColors ?? {},
    textFonts: data.textFonts ?? {},
    nodeParents: data.nodeParents ?? {},
    viewport: data.viewport ?? { x: 0, y: 0, zoom: 1 },
    activeLevel: data.activeLevel ?? 'L1',
    navigationStack: data.navigationStack ?? [],
  };
}

/**
 * Opens a file picker to select a .c4.json file.
 * Returns the file handle and parsed workspace, or null if cancelled.
 */
export async function openFile(): Promise<{
  handle: FileSystemFileHandle;
  workspace: WorkspaceFile;
} | null> {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: FILE_TYPES,
      multiple: false,
    });

    const file = await handle.getFile();
    const text = await file.text();
    const workspace = parseWorkspace(text);

    return { handle, workspace };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Saves the workspace to the existing file handle.
 */
export async function saveToHandle(
  handle: FileSystemFileHandle,
  workspace: WorkspaceFile
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serializeWorkspace(workspace));
  await writable.close();
}

/**
 * Opens a "Save As" dialog to create a new .c4.json file.
 * Returns the new file handle, or null if cancelled.
 */
export async function saveAsNewFile(
  workspace: WorkspaceFile
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: `${workspace.name}.c4.json`,
      types: FILE_TYPES,
    });

    await saveToHandle(handle, workspace);
    return handle;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Checks if the File System Access API (open/save file pickers) is supported.
 */
export function isFileApiSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}
