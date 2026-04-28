/**
 * Type declarations for the File System Access API.
 * These are experimental browser APIs available in Chromium-based browsers.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob | WriteParams): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

interface WriteParams {
  type: 'write' | 'seek' | 'truncate';
  data?: string | BufferSource | Blob;
  position?: number;
  size?: number;
}

interface FileSystemFileHandle {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
  readonly kind: 'directory';
  readonly name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }): Promise<FileSystemDirectoryHandle>;

  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;

  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
