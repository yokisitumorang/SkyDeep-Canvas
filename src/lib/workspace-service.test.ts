import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSupported, openWorkspace, scanFiles, readFile, readFileFromHandle, writeFile } from './workspace-service';

/**
 * Creates a mock FileSystemFileHandle.
 */
function createMockFileHandle(name: string): FileSystemFileHandle {
  return { kind: 'file' as const, name } as FileSystemFileHandle;
}

/**
 * Creates a mock FileSystemDirectoryHandle with the given entries.
 * Supports nested directories for recursive scanning tests.
 */
function createMockDirectoryHandle(
  entries: Array<[string, 'file' | 'directory', FileSystemDirectoryHandle?]>
): FileSystemDirectoryHandle {
  const entriesIterator = async function* () {
    for (const [name, kind, subDirHandle] of entries) {
      if (kind === 'directory' && subDirHandle) {
        yield [name, subDirHandle] as [string, FileSystemDirectoryHandle];
      } else {
        const entryHandle = createMockFileHandle(name);
        yield [name, kind === 'file' ? entryHandle : { kind: 'directory' as const, name }] as [string, FileSystemFileHandle | FileSystemDirectoryHandle];
      }
    }
  };

  return {
    kind: 'directory' as const,
    name: 'test-workspace',
    entries: entriesIterator,
    getFileHandle: vi.fn(),
    getDirectoryHandle: vi.fn(),
    removeEntry: vi.fn(),
    resolve: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
    [Symbol.asyncIterator]: entriesIterator,
  } as unknown as FileSystemDirectoryHandle;
}

/**
 * Shorthand to create a simple flat directory (no subdirectories to recurse into).
 */
function createFlatMockDirectoryHandle(
  entries: Array<[string, 'file' | 'directory']>
): FileSystemDirectoryHandle {
  return createMockDirectoryHandle(
    entries.map(([name, kind]) => [name, kind, undefined])
  );
}

describe('isSupported', () => {
  it('returns true when showDirectoryPicker is available on window', () => {
    // jsdom environment has window, so we add the property
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    expect(isSupported()).toBe(true);
  });

  it('returns false when showDirectoryPicker is not available', () => {
    // Remove the property to simulate unsupported browser
    const descriptor = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker');
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    expect(isSupported()).toBe(false);

    // Restore for other tests
    if (descriptor) {
      Object.defineProperty(window, 'showDirectoryPicker', descriptor);
    }
  });
});

describe('openWorkspace', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('returns the directory handle on successful selection', async () => {
    const mockHandle = { kind: 'directory', name: 'my-workspace' } as FileSystemDirectoryHandle;
    vi.mocked(window.showDirectoryPicker).mockResolvedValue(mockHandle);

    const result = await openWorkspace();
    expect(result).toBe(mockHandle);
  });

  it('returns null when user cancels the dialog (AbortError)', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError');
    vi.mocked(window.showDirectoryPicker).mockRejectedValue(abortError);

    const result = await openWorkspace();
    expect(result).toBeNull();
  });

  it('re-throws non-AbortError exceptions', async () => {
    const securityError = new DOMException('Not allowed', 'SecurityError');
    vi.mocked(window.showDirectoryPicker).mockRejectedValue(securityError);

    await expect(openWorkspace()).rejects.toEqual(securityError);
  });
});

describe('scanFiles', () => {
  it('returns only .md files from the directory', async () => {
    const handle = createFlatMockDirectoryHandle([
      ['readme.md', 'file'],
      ['system.md', 'file'],
      ['config.yaml', 'file'],
      ['notes.txt', 'file'],
      ['data.json', 'file'],
    ]);

    const result = await scanFiles(handle);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(['readme.md', 'system.md']);
  });

  it('returns empty array when no .md files exist', async () => {
    const handle = createFlatMockDirectoryHandle([
      ['config.yaml', 'file'],
      ['data.json', 'file'],
      ['script.ts', 'file'],
    ]);

    const result = await scanFiles(handle);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for an empty directory', async () => {
    const handle = createFlatMockDirectoryHandle([]);

    const result = await scanFiles(handle);
    expect(result).toHaveLength(0);
  });

  it('recursively scans subdirectories for .md files', async () => {
    const subDir = createMockDirectoryHandle([
      ['nested.md', 'file', undefined],
      ['ignore.txt', 'file', undefined],
    ]);

    const handle = createMockDirectoryHandle([
      ['top.md', 'file', undefined],
      ['subdir', 'directory', subDir],
    ]);

    const result = await scanFiles(handle);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(['top.md', 'subdir/nested.md']);
  });

  it('handles files with .md in the middle of the name but different extension', async () => {
    const handle = createFlatMockDirectoryHandle([
      ['readme.md.bak', 'file'],
      ['file.markdown', 'file'],
      ['real.md', 'file'],
    ]);

    const result = await scanFiles(handle);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('real.md');
  });

  it('includes all .md files regardless of name prefix', async () => {
    const handle = createFlatMockDirectoryHandle([
      ['.hidden.md', 'file'],
      ['UPPERCASE.MD', 'file'],
      ['normal.md', 'file'],
    ]);

    const result = await scanFiles(handle);
    // .md is case-sensitive, so UPPERCASE.MD won't match .md
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(['.hidden.md', 'normal.md']);
  });
});

describe('readFile', () => {
  it('reads text content from a file in the workspace', async () => {
    const mockFile = {
      text: vi.fn().mockResolvedValue('# Hello World'),
    };
    const mockFileHandle = {
      kind: 'file' as const,
      name: 'test.md',
      getFile: vi.fn().mockResolvedValue(mockFile),
    };
    const mockDirHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    } as unknown as FileSystemDirectoryHandle;

    const content = await readFile(mockDirHandle, 'test.md');
    expect(content).toBe('# Hello World');
    expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('test.md');
  });
});

describe('readFileFromHandle', () => {
  it('reads text content directly from a FileSystemFileHandle', async () => {
    const mockFile = {
      text: vi.fn().mockResolvedValue('# Direct Read'),
    };
    const mockFileHandle = {
      kind: 'file' as const,
      name: 'test.md',
      getFile: vi.fn().mockResolvedValue(mockFile),
    } as unknown as FileSystemFileHandle;

    const content = await readFileFromHandle(mockFileHandle);
    expect(content).toBe('# Direct Read');
  });
});

describe('writeFile', () => {
  it('writes content to a file, creating it if needed', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockFileHandle = {
      kind: 'file' as const,
      name: 'output.md',
      createWritable: vi.fn().mockResolvedValue(mockWritable),
    };
    const mockDirHandle = {
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    } as unknown as FileSystemDirectoryHandle;

    await writeFile(mockDirHandle, 'output.md', '# New Content');

    expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('output.md', { create: true });
    expect(mockWritable.write).toHaveBeenCalledWith('# New Content');
    expect(mockWritable.close).toHaveBeenCalled();
  });
});
