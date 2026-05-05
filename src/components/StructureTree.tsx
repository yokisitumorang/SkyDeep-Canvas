'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Layers, Plus, Trash2 } from 'lucide-react';
import type { ArchitectureElement } from '@/types/c4';

/** A tree node representing a sublayer */
interface TreeNode {
  /** The element that owns this sublayer */
  element: ArchitectureElement;
  /** The custom sublayer label (or fallback to element name) */
  label: string;
  /** Nested sublayers within this one */
  children: TreeNode[];
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  label: string;
}

interface StructureTreeProps {
  elements: ArchitectureElement[];
  /** Custom sublayer labels keyed by node ID */
  subLayerLabels: Record<string, string>;
  /** The parentId of the currently active sub-canvas (null = root) */
  activeParentId: string | null;
  /** Called when the user clicks a node to navigate to its sub-canvas */
  onNavigate: (nodeId: string) => void;
  /** Called when the user clicks "Root" to go back to root */
  onNavigateRoot: () => void;
  /** Called when the user wants to add a nested sublayer under a node */
  onAddSubLayer: (parentNodeId: string, parentNodeName: string) => void;
  /** Called when the user wants to delete a sublayer */
  onDeleteSubLayer: (nodeId: string) => void;
}

/**
 * Builds a tree of only the elements that have sublayers.
 */
function buildSubLayerTree(
  elements: ArchitectureElement[],
  subLayerLabels: Record<string, string>,
): TreeNode[] {
  const parentIds = new Set<string>();
  for (const el of elements) {
    if (el.parentId) {
      parentIds.add(el.parentId);
    }
  }
  for (const id of Object.keys(subLayerLabels)) {
    parentIds.add(id);
  }

  const elementMap = new Map<string, ArchitectureElement>();
  for (const el of elements) {
    elementMap.set(el.id, el);
  }

  function buildChildren(parentId: string | undefined): TreeNode[] {
    const nodes: TreeNode[] = [];
    for (const id of parentIds) {
      const el = elementMap.get(id);
      if (!el) continue;
      if ((el.parentId ?? undefined) === parentId) {
        nodes.push({
          element: el,
          label: subLayerLabels[id] ?? el.name,
          children: buildChildren(id),
        });
      }
    }
    return nodes;
  }

  return buildChildren(undefined);
}

function TreeItem({
  node,
  depth,
  activeParentId,
  onNavigate,
  onContextMenu,
  defaultExpanded,
}: {
  node: TreeNode;
  depth: number;
  activeParentId: string | null;
  onNavigate: (nodeId: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string, label: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;
  const isActive = activeParentId === node.element.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) {
            setExpanded((prev) => !prev);
          }
          onNavigate(node.element.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node.element.id, node.label);
        }}
        className={`flex items-center gap-1.5 w-full text-left py-1 pr-2 rounded-md transition-colors text-xs ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 font-semibold'
            : 'text-slate-700 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.label}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-slate-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-slate-400" />
            )
          ) : null}
        </span>

        <Layers className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />

        <span className="truncate">{node.label}</span>
      </button>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.element.id}
              node={child}
              depth={depth + 1}
              activeParentId={activeParentId}
              onNavigate={onNavigate}
              onContextMenu={onContextMenu}
              defaultExpanded={isOnActivePath(child, activeParentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Check if a node or any of its descendants is the active parent */
function isOnActivePath(node: TreeNode, activeParentId: string | null): boolean {
  if (!activeParentId) return false;
  if (node.element.id === activeParentId) return true;
  return node.children.some((child) => isOnActivePath(child, activeParentId));
}

export default function StructureTree({
  elements,
  subLayerLabels,
  activeParentId,
  onNavigate,
  onNavigateRoot,
  onAddSubLayer,
  onDeleteSubLayer,
}: StructureTreeProps) {
  const tree = useMemo(
    () => buildSubLayerTree(elements, subLayerLabels),
    [elements, subLayerLabels],
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const hasSubLayers = tree.length > 0;

  function handleContextMenu(e: React.MouseEvent, nodeId: string, label: string) {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, label });
  }

  return (
    <div className="flex flex-col">
      {/* Root entry */}
      <button
        type="button"
        onClick={onNavigateRoot}
        className={`flex items-center gap-1.5 w-full text-left py-1 px-2 rounded-md transition-colors text-xs ${
          activeParentId === null
            ? 'bg-indigo-50 text-indigo-700 font-semibold'
            : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          <Layers className="h-3 w-3 text-indigo-500" />
        </span>
        <span>Root</span>
      </button>

      {/* Sublayer tree */}
      {hasSubLayers ? (
        tree.map((node) => (
          <TreeItem
            key={node.element.id}
            node={node}
            depth={1}
            activeParentId={activeParentId}
            onNavigate={onNavigate}
            onContextMenu={handleContextMenu}
            defaultExpanded={isOnActivePath(node, activeParentId)}
          />
        ))
      ) : (
        <p className="px-3 py-1.5 text-xs text-slate-400 italic">
          No sub layers yet
        </p>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                onAddSubLayer(contextMenu.nodeId, contextMenu.label);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              Add Sub Layer
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteSubLayer(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Delete Sub Layer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
