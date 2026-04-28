'use client';

import { useState } from 'react';
import type { C4Level } from '@/types/c4';
import CreateElementForm, { type CreateElementFormData } from './CreateElementForm';

export interface ToolbarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onCreateElement: (data: CreateElementFormData) => Promise<void>;
  onAddText: () => void;
  currentLevel: C4Level;
  parentId?: string;
  isSupported: boolean;
  workspaceName: string | null;
  isSavingCache: boolean;
  isSavingFile: boolean;
}

export default function Toolbar({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onCreateElement,
  onAddText,
  currentLevel,
  parentId,
  isSupported,
  workspaceName,
  isSavingCache,
  isSavingFile,
}: ToolbarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function handleCreateSubmit(data: CreateElementFormData) {
    await onCreateElement(data);
    setShowCreateModal(false);
  }

  const btnSecondary =
    'text-xs font-medium text-slate-700 px-2.5 py-1.5 bg-white rounded-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors';
  const btnPrimary =
    'text-xs font-medium text-white px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm disabled:opacity-40 transition-colors';

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
        {/* File actions */}
        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5">
          <button type="button" onClick={onNew} disabled={!isSupported} className={btnSecondary}>
            New
          </button>
          <button type="button" onClick={onOpen} disabled={!isSupported} className={btnPrimary}>
            Open
          </button>
          <button type="button" onClick={onSave} disabled={!isSupported || isSavingFile} className={btnSecondary}>
            Save
          </button>
          <button type="button" onClick={onSaveAs} disabled={!isSupported || isSavingFile} className={btnSecondary}>
            Save As
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Element actions */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className={btnSecondary}
        >
          + Element
        </button>
        <button
          type="button"
          onClick={onAddText}
          className={btnSecondary}
        >
          + Text
        </button>

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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Create Element
            </h2>
            <CreateElementForm
              onSubmit={handleCreateSubmit}
              onCancel={() => setShowCreateModal(false)}
              currentLevel={currentLevel}
              parentId={parentId}
            />
          </div>
        </div>
      )}
    </>
  );
}
