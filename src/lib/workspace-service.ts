import type { WorkspaceFileEntry } from '@/types/workspace';

/**
 * Checks whether the File System Access API is available in the current browser.
 * Returns true for Chromium-based browsers (Chrome, Edge, Arc, Brave).
 */
export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Opens a native directory picker dialog and returns the selected directory handle.
 * Silently returns null if the user cancels the dialog (AbortError).
 */
export async function openWorkspace(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker();
    return handle;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Scans a workspace directory recursively for all `.md` files.
 * Traverses subdirectories to find Markdown files at any depth.
 */
export async function scanFiles(
  handle: FileSystemDirectoryHandle
): Promise<WorkspaceFileEntry[]> {
  const entries: WorkspaceFileEntry[] = [];

  async function scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    pathPrefix: string
  ) {
    for await (const [name, entryHandle] of dirHandle.entries()) {
      if (entryHandle.kind === 'file' && name.endsWith('.md')) {
        const filePath = pathPrefix ? `${pathPrefix}/${name}` : name;
        entries.push({ name: filePath, handle: entryHandle as FileSystemFileHandle });
      } else if (entryHandle.kind === 'directory') {
        const subPath = pathPrefix ? `${pathPrefix}/${name}` : name;
        await scanDirectory(
          entryHandle as FileSystemDirectoryHandle,
          subPath
        );
      }
    }
  }

  await scanDirectory(handle, '');
  return entries;
}

/**
 * Reads the text content of a single file using its FileSystemFileHandle directly.
 */
export async function readFileFromHandle(
  fileHandle: FileSystemFileHandle
): Promise<string> {
  const file = await fileHandle.getFile();
  return file.text();
}

/**
 * Reads the text content of a single file from the workspace.
 */
export async function readFile(
  handle: FileSystemDirectoryHandle,
  fileName: string
): Promise<string> {
  const fileHandle = await handle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

/**
 * Writes text content to a file in the workspace, creating it if it doesn't exist.
 */
export async function writeFile(
  handle: FileSystemDirectoryHandle,
  fileName: string,
  content: string
): Promise<void> {
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
