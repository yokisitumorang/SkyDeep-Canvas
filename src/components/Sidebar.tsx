'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, FilePlus, FolderOpen, Save, SaveAll, Box, Network, LayoutGrid, Type } from 'lucide-react';
import type { ArchitectureElement } from '@/types/c4';
import type { C4Level } from '@/types/c4';
import CreateElementForm, { type CreateElementFormData } from './CreateElementForm';
import StructureTree from './StructureTree';

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onAddSimpleNode: () => void;
  onAddTextNode: () => void;
  onCreateElement: (data: CreateElementFormData) => Promise<void>;
  currentLevel: C4Level;
  parentId?: string;
  isSupported: boolean;
  isSavingFile: boolean;
  elements: ArchitectureElement[];
  subLayerLabels: Record<string, string>;
  activeParentId: string | null;
  onNavigateToNode: (nodeId: string) => void;
  onNavigateToRoot: () => void;
  onAddSubLayer: (parentNodeId: string, parentNodeName: string) => void;
  onDeleteSubLayer: (nodeId: string) => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onAddSimpleNode,
  onAddTextNode,
  onCreateElement,
  currentLevel,
  parentId,
  isSupported,
  isSavingFile,
  elements,
  subLayerLabels,
  activeParentId,
  onNavigateToNode,
  onNavigateToRoot,
  onAddSubLayer,
  onDeleteSubLayer,
}: SidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function handleCreateSubmit(data: CreateElementFormData) {
    await onCreateElement(data);
    setShowCreateModal(false);
  }

  const btnItem =
    'flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors';
  const btnItemCollapsed =
    'flex items-center justify-center w-full py-2 px-0 text-slate-600 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors';

  return (
    <>
      <aside
        className={`flex-shrink-0 h-full bg-white border-r border-slate-200 flex flex-col transition-[width] duration-200 ease-in-out overflow-hidden ${
          isOpen ? 'w-56' : 'w-12'
        }`}
      >
        {/* Header with toggle */}
        <div
          className={`flex items-center border-b border-slate-200 flex-shrink-0 ${
            isOpen ? 'justify-between px-3 py-3' : 'justify-center py-3'
          }`}
        >
          {isOpen && (
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Menu
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>

        {/* File section */}
        <div className={`flex flex-col gap-1 flex-shrink-0 ${isOpen ? 'px-2 py-3' : 'px-1 py-3'}`}>
          {isOpen && (
            <p className="px-3 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wider">
              File
            </p>
          )}

          <button type="button" onClick={onNew} disabled={!isSupported} className={isOpen ? btnItem : btnItemCollapsed} title="New">
            <FilePlus className="h-4 w-4 shrink-0" />
            {isOpen && <span>New</span>}
          </button>

          <button type="button" onClick={onOpen} disabled={!isSupported} className={isOpen ? btnItem : btnItemCollapsed} title="Open">
            <FolderOpen className="h-4 w-4 shrink-0" />
            {isOpen && <span>Open</span>}
          </button>

          <button type="button" onClick={onSave} disabled={!isSupported || isSavingFile} className={isOpen ? btnItem : btnItemCollapsed} title="Save">
            <Save className="h-4 w-4 shrink-0" />
            {isOpen && <span>Save</span>}
          </button>

          <button type="button" onClick={onSaveAs} disabled={!isSupported || isSavingFile} className={isOpen ? btnItem : btnItemCollapsed} title="Save As">
            <SaveAll className="h-4 w-4 shrink-0" />
            {isOpen && <span>Save As</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-2 border-t border-slate-200 flex-shrink-0" />

        {/* Nodes section */}
        <div className={`flex flex-col gap-1 flex-shrink-0 ${isOpen ? 'px-2 py-3' : 'px-1 py-3'}`}>
          {isOpen && (
            <p className="px-3 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Nodes
            </p>
          )}

          <button type="button" onClick={() => setShowCreateModal(true)} className={isOpen ? btnItem : btnItemCollapsed} title="C4 Element">
            <LayoutGrid className="h-4 w-4 shrink-0" />
            {isOpen && <span>C4 Element</span>}
          </button>

          <button type="button" onClick={onAddSimpleNode} className={isOpen ? btnItem : btnItemCollapsed} title="Simple Node">
            <Box className="h-4 w-4 shrink-0" />
            {isOpen && <span>Simple Node</span>}
          </button>

          <button type="button" onClick={onAddTextNode} className={isOpen ? btnItem : btnItemCollapsed} title="Text Node">
            <Type className="h-4 w-4 shrink-0" />
            {isOpen && <span>Text Node</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-2 border-t border-slate-200 flex-shrink-0" />

        {/* Structure tree section */}
        <div className={`flex flex-col min-h-0 flex-1 ${isOpen ? 'py-3' : 'py-3'}`}>
          {isOpen ? (
            <>
              <p className="px-5 pb-2 text-xs font-medium text-slate-400 uppercase tracking-wider flex-shrink-0">
                Structure
              </p>
              <div className="flex-1 overflow-y-auto px-2">
                <StructureTree
                  elements={elements}
                  subLayerLabels={subLayerLabels}
                  activeParentId={activeParentId}
                  onNavigate={onNavigateToNode}
                  onNavigateRoot={onNavigateToRoot}
                  onAddSubLayer={onAddSubLayer}
                  onDeleteSubLayer={onDeleteSubLayer}
                />
              </div>
            </>
          ) : (
            <div className="flex justify-center px-1">
              <button
                type="button"
                onClick={onToggle}
                className={btnItemCollapsed}
                title="Structure Map"
              >
                <Network className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Create C4 Element modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Create C4 Element
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
