'use client';

import { useState } from 'react';
import type { C4Level } from '@/types/c4';
import CreateElementForm, { type CreateElementFormData } from './CreateElementForm';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export interface ToolbarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onCreateElement: (data: CreateElementFormData) => Promise<void>;
  onAddText: () => void;
  onAddSimpleNode: () => void;
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
  onAddSimpleNode,
  currentLevel,
  parentId,
  isSupported,
  workspaceName,
  isSavingCache,
  isSavingFile,
}: ToolbarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function handleCreateSubmit(data: CreateElementFormData) {
    await onCreateElement(data);
    setShowCreateModal(false);
  }

  const btnSecondary =
    'text-xs font-medium text-slate-700 px-2.5 py-1.5 bg-white rounded-md ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors';
  const btnPrimary =
    'text-xs font-medium text-white px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm disabled:opacity-40 transition-colors';
  const btnSheet =
    'text-sm font-medium text-slate-700 w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors';

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
        {/* Sidebar toggle */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                className="flex items-center justify-center h-7 w-7 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Toggle sidebar"
              />
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:max-w-xs p-0 bg-white">
            <SheetHeader className="px-4 py-4 sm:px-4 border-b border-slate-200">
              <SheetTitle className="text-sm font-semibold text-slate-900">
                Sidebar
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 py-4 sm:px-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">File</p>
              <button type="button" onClick={() => { onNew(); setSheetOpen(false); }} disabled={!isSupported} className={btnSheet}>
                New
              </button>
              <button type="button" onClick={() => { onOpen(); setSheetOpen(false); }} disabled={!isSupported} className={btnSheet}>
                Open
              </button>
              <button type="button" onClick={() => { onSave(); setSheetOpen(false); }} disabled={!isSupported || isSavingFile} className={btnSheet}>
                Save
              </button>
              <button type="button" onClick={() => { onSaveAs(); setSheetOpen(false); }} disabled={!isSupported || isSavingFile} className={btnSheet}>
                Save As
              </button>
            </div>
            <div className="px-4 py-4 sm:px-4 flex flex-col gap-2 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nodes</p>
              <button type="button" onClick={() => { onAddSimpleNode(); setSheetOpen(false); }} className={btnSheet}>
                + Simple Node
              </button>
            </div>
          </SheetContent>
        </Sheet>

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
