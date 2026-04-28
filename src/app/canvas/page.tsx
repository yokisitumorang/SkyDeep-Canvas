'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  type Viewport,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnMove,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '@reactflow/node-resizer/dist/style.css';
import { Toaster, toast } from 'sonner';

import SystemNode from '@/components/nodes/SystemNode';
import ContainerNode from '@/components/nodes/ContainerNode';
import ComponentNode from '@/components/nodes/ComponentNode';
import CodeNode from '@/components/nodes/CodeNode';
import BoundaryGroupNode from '@/components/nodes/BoundaryGroupNode';
import type { NodeTypes } from 'reactflow';
import Toolbar from '@/components/Toolbar';
import {
  useDiagramStore,
  useNodes,
  useEdges,
  useActiveLevel,
  useNavigationStack,
} from '@/store/diagram-store';
import type { ReactFlowNode, ReactFlowEdge } from '@/store/diagram-store';
import type { CreateElementFormData } from '@/components/CreateElementForm';
import EditElementForm from '@/components/EditElementForm';
import EdgeContextMenu from '@/components/EdgeContextMenu';
import NodeContextMenu from '@/components/NodeContextMenu';
import { generateId } from '@/lib/serializer';
import { elementsToNodes, elementsToEdges } from '@/lib/transform';
import { computeLayout } from '@/lib/layout-engine';
import type { ArchitectureElement } from '@/types/c4';
import type { LayoutInput } from '@/types/layout';
import {
  openFile,
  saveToHandle,
  saveAsNewFile,
  createEmptyWorkspace,
  isFileApiSupported,
  parseWorkspace,
  type WorkspaceFile,
} from '@/lib/file-workspace';
import {
  saveFileHandle,
  loadFileHandle,
  verifyFilePermission,
  saveWorkspaceState,
  loadWorkspaceState,
  clearWorkspaceState,
} from '@/lib/workspace-persistence';

// Defined at module scope — these MUST NOT be inside a component
// to avoid React Flow error #002 about new nodeTypes references.
const nodeTypes: NodeTypes = {
  system: SystemNode,
  container: ContainerNode,
  component: ComponentNode,
  code: CodeNode,
  boundary: BoundaryGroupNode,
};

const defaultEdgeOptions = { type: 'smoothstep' as const };

function CanvasContent() {
  const nodes = useNodes();
  const edges = useEdges();
  const activeLevel = useActiveLevel();
  const navigationStack = useNavigationStack();
  const workspaceName = useDiagramStore((s) => s.workspaceName);

  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToFile, setIsSavingToFile] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
    edgeType: string;
  } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    currentColor?: string;
  } | null>(null);

  const setNodes = useDiagramStore((s) => s.setNodes);
  const setEdges = useDiagramStore((s) => s.setEdges);
  const setViewport = useDiagramStore((s) => s.setViewport);

  const currentParentId =
    navigationStack.length > 0
      ? navigationStack[navigationStack.length - 1].parentId ?? undefined
      : undefined;

  // Override callbacks in node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDrillDown: (nodeId: string) => {
          useDiagramStore.getState().drillDown(nodeId);
        },
        onEdit: (nodeId: string) => {
          setEditingElementId(nodeId);
        },
      },
    }));
  }, [nodes]);

  const handleViewportChange: OnMove = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
    },
    [setViewport]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const store = useDiagramStore.getState();
      const updated = applyNodeChanges(changes, store.nodes) as ReactFlowNode[];
      setNodes(updated);

      // Sync removals back to allElements so deleted nodes don't reappear
      const removeChanges = changes.filter(
        (c): c is NodeChange & { type: 'remove'; id: string } => c.type === 'remove'
      );
      if (removeChanges.length > 0) {
        const removedIds = new Set(removeChanges.map((c) => c.id));
        const filtered = store.allElements.filter((el) => !removedIds.has(el.id));
        store.setElements(filtered, store.parseErrors);

        // Also remove edges connected to deleted nodes
        const filteredEdges = updated.length > 0
          ? store.edges.filter(
              (e) => !removedIds.has(e.source) && !removedIds.has(e.target)
            )
          : store.edges;
        if (filteredEdges.length !== store.edges.length) {
          setEdges(filteredEdges);
        }

        // Clean up relationships pointing to deleted elements
        for (const el of filtered) {
          const cleanedRels = el.relationships.filter(
            (r) => !removedIds.has(r.targetId)
          );
          if (cleanedRels.length !== el.relationships.length) {
            store.updateElement(el.id, { relationships: cleanedRels });
          }
        }
      }
    },
    [setNodes, setEdges]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const currentEdges = useDiagramStore.getState().edges;
      const updated = applyEdgeChanges(changes, currentEdges) as ReactFlowEdge[];
      setEdges(updated);
    },
    [setEdges]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setEdgeMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
        edgeType: edge.type ?? 'smoothstep',
      });
    },
    []
  );

  const handleChangeEdgeType = useCallback(
    (edgeId: string, newType: string) => {
      const store = useDiagramStore.getState();
      const updatedEdges = store.edges.map((e) =>
        e.id === edgeId ? { ...e, type: newType } : e
      );
      store.setEdges(updatedEdges);
    },
    []
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string; data: Record<string, unknown> }) => {
      event.preventDefault();
      setNodeMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        currentColor: node.data.customColor as string | undefined,
      });
    },
    []
  );

  const handleChangeNodeColor = useCallback(
    (nodeId: string, color: string | undefined) => {
      const store = useDiagramStore.getState();
      // Update the node's data.customColor
      const updatedNodes = store.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, customColor: color } }
          : n
      );
      store.setNodes(updatedNodes);
    },
    []
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const store = useDiagramStore.getState();
      const edgeId = `${connection.source}-${connection.target}`;

      // Skip if this edge already exists
      if (store.edges.some((e) => e.id === edgeId)) return;

      // Add edge to the canvas
      const newEdge: ReactFlowEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'smoothstep',
        data: { hasWarning: false },
      };
      store.setEdges([...store.edges, newEdge]);

      // Add relationship to the source element's data so it persists on save
      const sourceElement = store.allElements.find(
        (el) => el.id === connection.source
      );
      if (sourceElement) {
        const alreadyExists = sourceElement.relationships.some(
          (r) => r.targetId === connection.target
        );
        if (!alreadyExists) {
          store.updateElement(connection.source, {
            relationships: [
              ...sourceElement.relationships,
              { targetId: connection.target! },
            ],
          });
        }
      }
    },
    []
  );

  // Track whether an edge update is in progress to distinguish from edge deletion
  const edgeUpdateSuccessful = useRef(true);

  const handleEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const handleEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      const store = useDiagramStore.getState();

      // Remove old edge
      const filteredEdges = store.edges.filter((e) => e.id !== oldEdge.id);

      if (newConnection.source && newConnection.target) {
        // Add new edge with updated connection
        const newEdge: ReactFlowEdge = {
          id: `${newConnection.source}-${newConnection.target}`,
          source: newConnection.source,
          target: newConnection.target,
          sourceHandle: newConnection.sourceHandle ?? undefined,
          targetHandle: newConnection.targetHandle ?? undefined,
          type: 'smoothstep',
          data: { hasWarning: false },
        };
        store.setEdges([...filteredEdges, newEdge]);

        // Update relationships: remove old, add new
        const oldSource = store.allElements.find((el) => el.id === oldEdge.source);
        if (oldSource) {
          store.updateElement(oldEdge.source, {
            relationships: oldSource.relationships.filter(
              (r) => r.targetId !== oldEdge.target
            ),
          });
        }

        const newSource = useDiagramStore.getState().allElements.find(
          (el) => el.id === newConnection.source
        );
        if (newSource) {
          const alreadyExists = newSource.relationships.some(
            (r) => r.targetId === newConnection.target
          );
          if (!alreadyExists) {
            store.updateElement(newConnection.source!, {
              relationships: [
                ...newSource.relationships,
                { targetId: newConnection.target! },
              ],
            });
          }
        }
      } else {
        store.setEdges(filteredEdges);
      }
    },
    []
  );

  const handleEdgeUpdateEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeUpdateSuccessful.current) {
        // Edge was dropped in empty space — remove it
        const store = useDiagramStore.getState();
        store.setEdges(store.edges.filter((e) => e.id !== edge.id));

        // Remove the relationship from the source element
        const sourceElement = store.allElements.find((el) => el.id === edge.source);
        if (sourceElement) {
          store.updateElement(edge.source, {
            relationships: sourceElement.relationships.filter(
              (r) => r.targetId !== edge.target
            ),
          });
        }
      }
      edgeUpdateSuccessful.current = true;
    },
    []
  );

  /**
   * Takes a list of elements, filters/transforms/layouts them, and updates the store.
   * Uses savedPositions for nodes that already have positions;
   * only runs auto-layout for nodes without saved positions.
   */
  const renderElements = useCallback(
    async (
      elements: ArchitectureElement[],
      savedPositions: Record<string, { x: number; y: number; width?: number; height?: number }> = {},
      savedEdgeStyles: Record<string, { type?: string; sourceHandle?: string; targetHandle?: string }> = {},
      savedNodeColors: Record<string, string> = {}
    ) => {
      const store = useDiagramStore.getState();

      const levelTypeMap: Record<string, string> = {
        L1: 'system',
        L2: 'container',
        L3: 'component',
        L4: 'code',
      };
      const activeType = levelTypeMap[store.activeLevel];

      const navStack = store.navigationStack;
      const currentParent =
        navStack.length > 0
          ? navStack[navStack.length - 1].parentId
          : null;

      let filteredElements = elements.filter((el) => {
        if (el.type !== activeType) return false;
        if (currentParent !== null) {
          return el.parentId === currentParent;
        }
        return true;
      });

      // Fallback: show all top-level elements if none match the active level
      if (filteredElements.length === 0 && currentParent === null) {
        filteredElements = elements.filter((el) => !el.parentId);
      }

      const rfNodes = elementsToNodes(filteredElements, elements);
      const rfEdges = elementsToEdges(filteredElements, elements);

      // Split nodes into those with saved positions and those needing layout
      const nodesNeedingLayout = rfNodes.filter((n) => !savedPositions[n.id]);

      let layoutPositionMap = new Map<string, { x: number; y: number }>();

      // Only run auto-layout for nodes without saved positions
      if (nodesNeedingLayout.length > 0) {
        const layoutInput: LayoutInput = {
          nodes: nodesNeedingLayout.map((node) => ({
            id: node.id,
            width: 250,
            height: 150,
          })),
          edges: rfEdges
            .filter(
              (edge) =>
                nodesNeedingLayout.some((n) => n.id === edge.source) &&
                nodesNeedingLayout.some((n) => n.id === edge.target)
            )
            .map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
            })),
          boundaryGroups: [],
        };

        const layoutResult = await computeLayout(layoutInput);
        layoutPositionMap = new Map(
          layoutResult.nodes.map((n) => [n.id, { x: n.x, y: n.y }])
        );
      }

      // Apply positions: saved first, then layout, then default
      const positionedNodes: ReactFlowNode[] = rfNodes.map((node) => {
        const saved = savedPositions[node.id];
        const layoutPos = layoutPositionMap.get(node.id);
        const savedColor = savedNodeColors[node.id];
        return {
          ...node,
          position: saved
            ? { x: saved.x, y: saved.y }
            : layoutPos ?? node.position,
          data: {
            ...node.data,
            ...(savedColor ? { customColor: savedColor } : {}),
          },
          ...(saved?.width || saved?.height
            ? {
                style: {
                  ...node.style,
                  ...(saved.width ? { width: saved.width } : {}),
                  ...(saved.height ? { height: saved.height } : {}),
                },
              }
            : {}),
        };
      });

      store.setNodes(positionedNodes);

      // Apply saved edge styles (type, handles)
      const styledEdges = rfEdges.map((edge) => {
        const saved = savedEdgeStyles[edge.id];
        if (saved) {
          return {
            ...edge,
            type: saved.type ?? edge.type,
            sourceHandle: saved.sourceHandle ?? edge.sourceHandle,
            targetHandle: saved.targetHandle ?? edge.targetHandle,
          };
        }
        return edge;
      });
      store.setEdges(styledEdges);
    },
    []
  );

  /**
   * Loads a workspace file into the store and renders it.
   */
  const loadWorkspace = useCallback(
    async (workspace: WorkspaceFile, handle: FileSystemFileHandle) => {
      const store = useDiagramStore.getState();

      store.setFileHandle(handle, workspace.name);
      store.setElements(workspace.elements, []);

      useDiagramStore.setState({
        activeLevel: workspace.activeLevel,
        navigationStack: workspace.navigationStack,
        viewport: workspace.viewport,
      });

      // Pass saved positions so nodes keep their positions from the file
      await renderElements(workspace.elements, workspace.positions ?? {}, workspace.edgeStyles ?? {}, workspace.nodeColors ?? {});

      store.setViewport(workspace.viewport);
    },
    [renderElements]
  );

  /** Captures current node positions and sizes from the store. */
  const capturePositions = useCallback(() => {
    const store = useDiagramStore.getState();
    const positions: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
    for (const node of store.nodes) {
      const w = node.style?.width as number | undefined;
      const h = node.style?.height as number | undefined;
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
        ...(w ? { width: w } : {}),
        ...(h ? { height: h } : {}),
      };
    }
    return positions;
  }, []);

  /** Captures current edge styles from the store. */
  const captureEdgeStyles = useCallback(() => {
    const store = useDiagramStore.getState();
    const edgeStyles: Record<string, { type?: string; sourceHandle?: string; targetHandle?: string }> = {};
    for (const edge of store.edges) {
      edgeStyles[edge.id] = {
        ...(edge.type ? { type: edge.type } : {}),
        ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
        ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
      };
    }
    return edgeStyles;
  }, []);

  /** Captures current node colors from the store. */
  const captureNodeColors = useCallback(() => {
    const store = useDiagramStore.getState();
    const nodeColors: Record<string, string> = {};
    for (const node of store.nodes) {
      const color = node.data.customColor as string | undefined;
      if (color) nodeColors[node.id] = color;
    }
    return nodeColors;
  }, []);

  /**
   * Builds the current WorkspaceFile from store state for saving.
   * Captures current node positions so they persist across save/open.
   */
  const buildWorkspaceFile = useCallback((): WorkspaceFile => {
    const store = useDiagramStore.getState();
    const positions = capturePositions();
    const edgeStyles = captureEdgeStyles();
    const nodeColors = captureNodeColors();

    return {
      version: 1,
      name: store.workspaceName ?? 'Untitled',
      elements: store.allElements,
      positions,
      edgeStyles,
      nodeColors,
      viewport: store.viewport,
      activeLevel: store.activeLevel,
      navigationStack: store.navigationStack,
    };
  }, [capturePositions, captureEdgeStyles, captureNodeColors]);

  /**
   * Auto-saves the current workspace state to IndexedDB.
   * Debounced — only writes after 500ms of inactivity.
   */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useDiagramStore.subscribe(() => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        const store = useDiagramStore.getState();
        // Don't save if there's nothing to save
        if (!store.workspaceName && store.allElements.length === 0) return;

        const positions: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
        for (const node of store.nodes) {
          const w = node.style?.width as number | undefined;
          const h = node.style?.height as number | undefined;
          positions[node.id] = {
            x: node.position.x,
            y: node.position.y,
            ...(w ? { width: w } : {}),
            ...(h ? { height: h } : {}),
          };
        }

        const edgeStyles: Record<string, { type?: string; sourceHandle?: string; targetHandle?: string }> = {};
        for (const edge of store.edges) {
          edgeStyles[edge.id] = {
            ...(edge.type ? { type: edge.type } : {}),
            ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
            ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
          };
        }

        const nodeColors: Record<string, string> = {};
        for (const node of store.nodes) {
          const color = node.data.customColor as string | undefined;
          if (color) nodeColors[node.id] = color;
        }

        const workspace: WorkspaceFile = {
          version: 1,
          name: store.workspaceName ?? 'Untitled',
          elements: store.allElements,
          positions,
          edgeStyles,
          nodeColors,
          viewport: store.viewport,
          activeLevel: store.activeLevel,
          navigationStack: store.navigationStack,
        };
        setIsSaving(true);
        saveWorkspaceState(workspace)
          .catch((err) => {
            console.warn('[auto-save] Failed to save to IndexedDB:', err);
          })
          .finally(() => {
            setTimeout(() => setIsSaving(false), 1000);
          });
      }, 2000);
    });

    return () => {
      unsub();
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // --- Toolbar handlers ---

  const handleNew = useCallback(() => {
    useDiagramStore.setState({
      fileHandle: null,
      workspaceName: 'Untitled',
      allElements: [],
      parseErrors: [],
      nodes: [],
      edges: [],
      activeLevel: 'L1',
      navigationStack: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    clearWorkspaceState().catch(() => {});
    toast.success('New workspace created');
  }, []);

  const handleOpen = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await openFile();
      if (!result) {
        setIsLoading(false);
        return;
      }

      await loadWorkspace(result.workspace, result.handle);
      await saveFileHandle(result.handle);

      toast.success(
        `Opened "${result.workspace.name}" with ${result.workspace.elements.length} element(s)`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to open file: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkspace]);

  const handleSave = useCallback(async () => {
    const store = useDiagramStore.getState();
    const handle = store.fileHandle;
    const workspace = buildWorkspaceFile();

    setIsSavingToFile(true);
    const start = Date.now();
    try {
      if (!handle) {
        const newHandle = await saveAsNewFile(workspace);
        if (newHandle) {
          useDiagramStore.setState({ fileHandle: newHandle });
          await saveFileHandle(newHandle);
          toast.success('File saved');
        }
        return;
      }

      await saveToHandle(handle, workspace);
      toast.success('File saved');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${message}`);
    } finally {
      const elapsed = Date.now() - start;
      setTimeout(() => setIsSavingToFile(false), Math.max(0, 1000 - elapsed));
    }
  }, [buildWorkspaceFile]);

  const handleSaveAs = useCallback(async () => {
    const workspace = buildWorkspaceFile();

    setIsSavingToFile(true);
    const start = Date.now();
    try {
      const newHandle = await saveAsNewFile(workspace);
      if (newHandle) {
        useDiagramStore.setState({ fileHandle: newHandle });
        await saveFileHandle(newHandle);
        toast.success('File saved');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${message}`);
    } finally {
      const elapsed = Date.now() - start;
      setTimeout(() => setIsSavingToFile(false), Math.max(0, 1000 - elapsed));
    }
  }, [buildWorkspaceFile]);

  const handleCreateElement = useCallback(
    async (data: CreateElementFormData) => {
      const store = useDiagramStore.getState();
      const id = generateId();

      const element: ArchitectureElement = {
        id,
        type: data.type,
        name: data.name,
        description: data.description,
        ...(data.technology ? { technology: data.technology } : {}),
        ...(currentParentId ? { parentId: currentParentId } : {}),
        relationships: [],
      };

      // Capture current node positions before re-rendering
      const currentPositions = capturePositions();

      store.addElement(element);

      const currentEdgeStyles = captureEdgeStyles();
      const currentNodeColors = captureNodeColors();

      // Re-render, preserving existing positions and edge styles
      await renderElements(useDiagramStore.getState().allElements, currentPositions, currentEdgeStyles, currentNodeColors);

      toast.success('Element created');
    },
    [currentParentId, renderElements]
  );

  // Detect API support after mount
  useEffect(() => {
    setIsSupported(isFileApiSupported());
  }, []);

  // Restore persisted workspace on mount.
  // Priority: IndexedDB state > file on disk
  useEffect(() => {
    async function restore() {
      try {
        // 1. Try to restore from IndexedDB (has unsaved changes)
        const cachedState = await loadWorkspaceState();
        const savedHandle = await loadFileHandle();

        if (cachedState && cachedState.elements) {
          setIsLoading(true);

          // Restore the file handle if available (for Save to work)
          if (savedHandle) {
            try {
              const hasPermission = await verifyFilePermission(savedHandle);
              if (hasPermission) {
                useDiagramStore.getState().setFileHandle(savedHandle, cachedState.name);
              }
            } catch {
              // Permission denied — still restore state, just can't save to file
            }
          }

          // Load from cached state (preserves unsaved changes)
          const store = useDiagramStore.getState();
          store.setElements(cachedState.elements, []);
          useDiagramStore.setState({
            workspaceName: cachedState.name,
            activeLevel: cachedState.activeLevel ?? 'L1',
            navigationStack: cachedState.navigationStack ?? [],
            viewport: cachedState.viewport ?? { x: 0, y: 0, zoom: 1 },
          });

          await renderElements(cachedState.elements, cachedState.positions ?? {}, cachedState.edgeStyles ?? {}, cachedState.nodeColors ?? {});
          store.setViewport(cachedState.viewport ?? { x: 0, y: 0, zoom: 1 });

          toast.success(`Restored "${cachedState.name}"`);
          setIsLoading(false);
          return;
        }

        // 2. Fall back to file on disk if no cached state
        if (!savedHandle) return;

        const hasPermission = await verifyFilePermission(savedHandle);
        if (!hasPermission) {
          toast.info('Permission denied. Please re-open the file.');
          return;
        }

        setIsLoading(true);
        const file = await savedHandle.getFile();
        const text = await file.text();
        const workspace = parseWorkspace(text);

        await loadWorkspace(workspace, savedHandle);
        toast.success(`Restored "${workspace.name}" from file`);
      } catch {
        // Silently ignore restoration errors
      } finally {
        setIsLoading(false);
      }
    }

    restore();
  }, [loadWorkspace, renderElements]);

  const showEmptyState = !isLoading && nodes.length === 0;

  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex-shrink-0 px-3 py-2 bg-white border-b border-slate-200 z-10">
        <Toolbar
          onNew={handleNew}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onCreateElement={handleCreateElement}
          currentLevel={activeLevel}
          parentId={currentParentId}
          isSupported={isSupported}
          workspaceName={workspaceName}
          isSavingCache={isSaving}
          isSavingFile={isSavingToFile}
        />
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="h-8 w-8 animate-spin text-indigo-600"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm font-medium text-slate-700">Loading…</p>
            </div>
          </div>
        )}

        {showEmptyState && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-md pointer-events-auto">
              <p className="text-sm font-medium text-slate-500">
                No elements yet. Open a .c4.json file or create an element to get started.
              </p>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onEdgeUpdateStart={handleEdgeUpdateStart}
          onEdgeUpdate={handleEdgeUpdate}
          onEdgeUpdateEnd={handleEdgeUpdateEnd}
          onEdgeContextMenu={handleEdgeContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onMoveEnd={handleViewportChange}
          edgeUpdaterRadius={20}
          onPaneClick={() => { setEdgeMenu(null); setNodeMenu(null); }}
          panOnDrag
          zoomOnScroll
          fitView
        >
          <Background gap={16} size={1} color="#e2e8f0" />
          <Controls
            showInteractive={false}
            className="!shadow-md !rounded-lg !border !border-slate-200"
          />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'system': return '#bfdbfe';
                case 'container': return '#bbf7d0';
                case 'component': return '#e9d5ff';
                case 'code': return '#e2e8f0';
                default: return '#f1f5f9';
              }
            }}
            maskColor="rgba(241, 245, 249, 0.7)"
            className="!shadow-md !rounded-lg !border !border-slate-200"
          />
        </ReactFlow>
      </div>

      <Toaster position="bottom-right" />

      {/* Edge context menu */}
      {edgeMenu && (
        <EdgeContextMenu
          x={edgeMenu.x}
          y={edgeMenu.y}
          edgeId={edgeMenu.edgeId}
          currentType={edgeMenu.edgeType}
          onChangeType={handleChangeEdgeType}
          onClose={() => setEdgeMenu(null)}
        />
      )}

      {/* Node context menu */}
      {nodeMenu && (
        <NodeContextMenu
          x={nodeMenu.x}
          y={nodeMenu.y}
          nodeId={nodeMenu.nodeId}
          currentColor={nodeMenu.currentColor}
          onChangeColor={handleChangeNodeColor}
          onClose={() => setNodeMenu(null)}
        />
      )}

      {/* Edit element dialog */}
      {editingElementId && (() => {
        const element = useDiagramStore.getState().allElements.find(
          (el) => el.id === editingElementId
        );
        if (!element) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Edit Element
              </h2>
              <EditElementForm
                element={element}
                onSave={(updated) => {
                  useDiagramStore.getState().updateElement(updated.id, {
                    name: updated.name,
                    type: updated.type,
                    description: updated.description,
                    technology: updated.technology,
                  });
                  // Update the node data so the canvas reflects changes immediately
                  const store = useDiagramStore.getState();
                  const updatedNodes = store.nodes.map((n) =>
                    n.id === updated.id
                      ? {
                          ...n,
                          type: updated.type,
                          data: {
                            ...n.data,
                            name: updated.name,
                            description: updated.description,
                            technology: updated.technology,
                            c4Type: updated.type,
                          },
                        }
                      : n
                  );
                  store.setNodes(updatedNodes);
                  setEditingElementId(null);
                }}
                onCancel={() => setEditingElementId(null)}
                onDelete={(id) => {
                  const store = useDiagramStore.getState();
                  store.removeElement(id);
                  store.setNodes(store.nodes.filter((n) => n.id !== id));
                  store.setEdges(
                    store.edges.filter((e) => e.source !== id && e.target !== id)
                  );
                  setEditingElementId(null);
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
