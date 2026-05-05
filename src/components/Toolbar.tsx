'use client';

export interface ToolbarProps {
  isSupported: boolean;
  workspaceName: string | null;
  isSavingCache: boolean;
  isSavingFile: boolean;
}

export default function Toolbar({
  isSupported,
  workspaceName,
  isSavingCache,
  isSavingFile,
}: ToolbarProps) {
  return (
    <>
      {!isSupported && (
        <div className="rounded-md bg-red-50 px-3 py-2 ring-1 ring-inset ring-red-200 mb-2">
          <p className="text-xs font-medium text-red-700">
            Your browser doesn&apos;t support the File System Access API. Use
            Chrome, Edge, or another Chromium-based browser.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Workspace name + saving indicators */}
        {workspaceName && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 truncate max-w-[180px]">
              {workspaceName}
            </span>

            {/* IndexedDB auto-save spinner (gray) */}
            {isSavingCache && !isSavingFile && (
              <svg
                className="h-3.5 w-3.5 animate-spin text-slate-300"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}

            {/* File save spinner (indigo) */}
            {isSavingFile && (
              <svg
                className="h-3.5 w-3.5 animate-spin text-indigo-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        )}
      </div>
    </>
  );
}
