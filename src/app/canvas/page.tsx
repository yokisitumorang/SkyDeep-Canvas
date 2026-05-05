'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  ConnectionMode,
  useReactFlow,
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
import LabeledGroupNode from '@/components/nodes/LabeledGroupNode';
import SimpleNode from '@/components/nodes/SimpleNode';
import TextNode from '@/components/nodes/TextNode';
import type { NodeTypes } from 'reactflow';
import Toolbar from '@/components/Toolbar';
import Sidebar from '@/components/Sidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import SheetTabBar from '@/components/SheetTabBar';
import {
  useDiagramStore,
  useNodes,
  useEdges,
  useActiveLevel,
  useNavigationStack,
  useSubCanvasStack,
  useAllElements,
  useSubLayerLabels,
} from '@/store/diagram-store';
import type { ReactFlowNode, ReactFlowEdge } from '@/store/diagram-store';
import { initHistory, undo, redo, clearHistory } from '@/store/history';
import type { CreateElementFormData } from '@/components/CreateElementForm';
import EditElementForm from '@/components/EditElementForm';
import EdgeContextMenu, { type ArrowStyle } from '@/components/EdgeContextMenu';
import NodeContextMenu from '@/components/NodeContextMenu';
import CreateSubLayerDialog from '@/components/CreateSubLayerDialog';
import PropertiesPanel from '@/components/PropertiesPanel';
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
  group: LabeledGroupNode,
  simple: SimpleNode,
  text: TextNode,
};

const defaultEdgeOptions = { type: 'smoothstep' as const };

function CanvasContent() {
  const nodes = useNodes();
  const edges = useEdges();
  const activeLevel = useActiveLevel();
  const navigationStack = useNavigationStack();
  const subCanvasStack = useSubCanvasStack();
  const allElements = useAllElements();
  const subLayerLabels = useSubLayerLabels();
  const workspaceName = useDiagramStore((s) => s.workspaceName);
  const { fitView, getViewport } = useReactFlow();

  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToFile, setIsSavingToFile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
    edgeType: string;
    arrowStyle: ArrowStyle;
  } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    nodeType?: string;
    currentColor?: string;
  } | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{
    x: number;
    y: number;
    nodeIds: string[];
  } | null>(null);
  const [subLayerDialog, setSubLayerDialog] = useState<{
    nodeId: string;
    nodeName: string;
  } | null>(null);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);

  const setNodes = useDiagramStore((s) => s.setNodes);
  const setEdges = useDiagramStore((s) => s.setEdges);
  const setViewport = useDiagramStore((s) => s.setViewport);

  // Initialize undo/redo history tracking
  useEffect(() => {
    const cleanup = initHistory();
    return cleanup;
  }, []);

  const currentParentId =
    subCanvasStack.length > 0
      ? subCanvasStack[subCanvasStack.length - 1].parentId
      : navigationStack.length > 0
        ? navigationStack[navigationStack.length - 1].parentId ?? undefined
        : undefined;

  // Stable ref for renderElements — allows callbacks defined before renderElements to call it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderElementsRef = useRef<((...args: any[]) => Promise<void>) | null>(null);

  /** Returns the center of the visible canvas area in flow coordinates. */
  const getCanvasCenter = useCallback((offsetX = 0, offsetY = 0) => {
    const vp = getViewport();
    // Try to get the actual ReactFlow wrapper dimensions (accounts for sidebar)
    const wrapper = document.querySelector('.react-flow') as HTMLElement | null;
    const w = wrapper?.clientWidth ?? window.innerWidth;
    const h = wrapper?.clientHeight ?? window.innerHeight;
    return {
      x: (-vp.x + w / 2) / vp.zoom + offsetX,
      y: (-vp.y + h / 2) / vp.zoom + offsetY,
    };
  }, [getViewport]);

  // Override callbacks in node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDrillDown: async (nodeId: string) => {
          // Save current nodes/edges, then navigate (store swaps to target sheet's saved state)
          useDiagramStore.getState().navigateToSubCanvas(nodeId);
          const store = useDiagramStore.getState();
          // Only call renderElements for first visit (no saved nodes for this sheet).
          // For previously visited sheets, the store already restored the correct nodes/edges,
          // and nodesWithCallbacks will re-wrap them with callbacks on next React render.
          if (store.nodes.length === 0) {
            await renderElementsRef.current?.(store.allElements);
          }
          // Fit view so the user can see all nodes on the target sheet
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        },
        onEdit: (nodeId: string) => {
          setEditingElementId(nodeId);
        },
        ...(node.type === 'group' ? {
          onLabelChange: (nodeId: string, label: string) => {
            useDiagramStore.getState().updateElement(nodeId, { name: label });
            const store = useDiagramStore.getState();
            store.setNodes(
              store.nodes.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
              )
            );
          },
        } : {}),
      },
    }));
  }, [nodes]);

  // Derive the currently selected node and its backing element for the properties panel
  const selectedNode = useMemo(
    () => nodes.find((n) => n.selected) ?? null,
    [nodes],
  );
  const selectedElement = useMemo(
    () => (selectedNode ? allElements.find((el) => el.id === selectedNode.id) ?? null : null),
    [selectedNode, allElements],
  );

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
      const store = useDiagramStore.getState();
      const currentEdges = store.edges;
      const updated = applyEdgeChanges(changes, currentEdges) as ReactFlowEdge[];
      setEdges(updated);

      // Sync removals back to element.relationships so deleted edges don't reappear
      const removeChanges = changes.filter(
        (c): c is EdgeChange & { type: 'remove'; id: string } => c.type === 'remove'
      );
      if (removeChanges.length > 0) {
        const removedEdgeIds = new Set(removeChanges.map((c) => c.id));
        // Find the actual edge objects being removed to get source/target info
        const removedEdges = currentEdges.filter((e) => removedEdgeIds.has(e.id));

        for (const removedEdge of removedEdges) {
          const sourceElement = store.allElements.find(
            (el) => el.id === removedEdge.source
          );
          if (sourceElement) {
            const cleanedRels = sourceElement.relationships.filter(
              (r) => r.targetId !== removedEdge.target
            );
            if (cleanedRels.length !== sourceElement.relationships.length) {
              store.updateElement(removedEdge.source, {
                relationships: cleanedRels,
              });
            }
          }
        }
      }
    },
    [setEdges]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      // Detect current arrow style from markers
      const hasEnd = !!edge.markerEnd;
      const hasStart = !!edge.markerStart;
      let arrowStyle: ArrowStyle = 'none';
      if (hasEnd && hasStart) arrowStyle = 'both';
      else if (hasEnd) arrowStyle = 'target';

      setEdgeMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
        edgeType: edge.type ?? 'smoothstep',
        arrowStyle,
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

  const arrowMarker = useMemo(() => ({
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: '#94a3b8',
  }), []);

  const handleChangeArrowStyle = useCallback(
    (edgeId: string, arrow: ArrowStyle) => {
      const store = useDiagramStore.getState();
      const updatedEdges = store.edges.map((e) => {
        if (e.id !== edgeId) return e;
        const updated = { ...e };
        if (arrow === 'none') {
          delete updated.markerEnd;
          delete updated.markerStart;
        } else if (arrow === 'target') {
          updated.markerEnd = arrowMarker;
          delete updated.markerStart;
        } else if (arrow === 'both') {
          updated.markerEnd = arrowMarker;
          updated.markerStart = arrowMarker;
        }
        return updated;
      });
      store.setEdges(updatedEdges);
    },
    [arrowMarker]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string; type?: string; data: Record<string, unknown> }) => {
      event.preventDefault();
      setNodeMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: node.type,
        currentColor: node.data.customColor as string | undefined,
      });
    },
    []
  );

  const handleChangeNodeColor = useCallback(
    (nodeId: string, color: string | undefined) => {
      const store = useDiagramStore.getState();
      const updatedNodes = store.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, customColor: color } }
          : n
      );
      store.setNodes(updatedNodes);
    },
    []
  );

  const handleSelectionContextMenu = useCallback(
    (event: React.MouseEvent, selectedNodes: { id: string }[]) => {
      event.preventDefault();
      const ids = selectedNodes.map((n) => n.id);
      if (ids.length < 2) return;
      setSelectionMenu({ x: event.clientX, y: event.clientY, nodeIds: ids });
    },
    []
  );

  const handleGroupSelected = useCallback((nodeIds: string[]) => {
    const store = useDiagramStore.getState();
    const PADDING = 40;

    const targets = store.nodes.filter((n) => nodeIds.includes(n.id));
    if (targets.length === 0) return;

    // Compute bounding box of selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of targets) {
      const w = (n.style?.width as number | undefined) ?? 250;
      const h = (n.style?.height as number | undefined) ?? 150;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }

    const groupId = generateId();
    const groupX = minX - PADDING;
    const groupY = minY - PADDING;
    const groupW = maxX - minX + PADDING * 2;
    const groupH = maxY - minY + PADDING * 2;

    // Group node — rendered behind children
    const groupNode: ReactFlowNode = {
      id: groupId,
      type: 'group',
      position: { x: groupX, y: groupY },
      style: { width: groupW, height: groupH },
      data: {
        label: 'Group',
        onLabelChange: () => {},
        onEdit: () => {},
        onDrillDown: () => {},
      },
    };

    // Re-position children relative to the group
    const updatedNodes = store.nodes.map((n) => {
      if (!nodeIds.includes(n.id)) return n;
      return {
        ...n,
        parentId: groupId,
        extent: 'parent' as const,
        position: {
          x: n.position.x - groupX,
          y: n.position.y - groupY,
        },
      };
    });

    // Group node must come before its children in the array
    store.setNodes([groupNode, ...updatedNodes]);

    // Persist as an element so it saves/restores
    store.addElement({
      id: groupId,
      type: 'group',
      name: 'Group',
      description: '',
      relationships: [],
    });

    setSelectionMenu(null);
  }, []);

  const handleUngroup = useCallback((groupId: string) => {
    const store = useDiagramStore.getState();
    const groupNode = store.nodes.find((n) => n.id === groupId);
    if (!groupNode) return;

    // Convert children back to absolute positions and remove parentId/extent
    const updatedNodes = store.nodes
      .filter((n) => n.id !== groupId)
      .map((n) => {
        if (n.parentId !== groupId) return n;
        return {
          ...n,
          parentId: undefined,
          extent: undefined,
          position: {
            x: n.position.x + groupNode.position.x,
            y: n.position.y + groupNode.position.y,
          },
        };
      });

    store.setNodes(updatedNodes);
    store.removeElement(groupId);
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const store = useDiagramStore.getState();

      // Use source/target + handle IDs for a unique edge key, allowing multiple connections
      const edgeId = `${connection.source}:${connection.sourceHandle ?? 'default'}-${connection.target}:${connection.targetHandle ?? 'default'}`;

      // Skip only if this exact same connection (same handles) already exists
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

  // --- Properties panel callbacks ---

  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<ArchitectureElement>) => {
      const store = useDiagramStore.getState();
      store.updateElement(id, updates);

      // Sync visual node data so the canvas reflects changes immediately
      const updatedNodes = store.nodes.map((n) => {
        if (n.id !== id) return n;
        return {
          ...n,
          data: {
            ...n.data,
            ...(updates.name !== undefined ? { name: updates.name, label: updates.name } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.technology !== undefined ? { technology: updates.technology } : {}),
          },
        };
      });
      store.setNodes(updatedNodes);
    },
    [],
  );

  const handleUpdateNodePosition = useCallback(
    (id: string, x: number, y: number) => {
      const store = useDiagramStore.getState();
      store.setNodes(
        store.nodes.map((n) =>
          n.id === id ? { ...n, position: { x, y } } : n,
        ),
      );
    },
    [],
  );

  const handleUpdateNodeSize = useCallback(
    (id: string, width: number, height: number) => {
      const store = useDiagramStore.getState();
      store.setNodes(
        store.nodes.map((n) =>
          n.id === id
            ? { ...n, style: { ...n.style, width, height } }
            : n,
        ),
      );
    },
    [],
  );

  const handleUpdateNodeColor = useCallback(
    (id: string, color: string | undefined) => {
      const store = useDiagramStore.getState();
      store.setNodes(
        store.nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, customColor: color } }
            : n,
        ),
      );
    },
    [],
  );

  const handleUpdateNodeFont = useCallback(
    (id: string, font: 'default' | 'virgil') => {
      const store = useDiagramStore.getState();
      store.setNodes(
        store.nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, font } }
            : n,
        ),
      );
    },
    [],
  );

  /** Generic node data updater — merges partial data into the node's data object */
  const handleUpdateNodeData = useCallback(
    (id: string, dataUpdates: Record<string, unknown>) => {
      const store = useDiagramStore.getState();
      store.setNodes(
        store.nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, ...dataUpdates } }
            : n,
        ),
      );
    },
    [],
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
      savedNodeColors: Record<string, string> = {},
      savedTextFonts: Record<string, 'default' | 'virgil'> = {},
      savedTextStyles: Record<string, { fontSize?: number; textColor?: string; fontWeight?: 'normal' | 'bold'; fontStyle?: 'normal' | 'italic'; textAlign?: 'left' | 'center' | 'right' | 'justify'; fontFamily?: string }> = {},
      savedNodeParents: Record<string, { parentId: string; extent?: 'parent' }> = {},
      savedEdges?: Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; type?: string; label?: string; markerEnd?: { type: string; width?: number; height?: number; color?: string }; markerStart?: { type: string; width?: number; height?: number; color?: string } }>
    ) => {
      const store = useDiagramStore.getState();

      const levelTypeMap: Record<string, string> = {
        L1: 'system',
        L2: 'container',
        L3: 'component',
        L4: 'code',
      };
      const activeType = levelTypeMap[store.activeLevel];

      const subCanvasStack = store.subCanvasStack;

      let filteredElements: ArchitectureElement[];

      if (subCanvasStack.length > 0) {
        // Sub-canvas mode: show ALL element types whose parentId matches the active sub-canvas parent
        const activeParentId = subCanvasStack[subCanvasStack.length - 1].parentId;
        filteredElements = elements.filter((el) => el.parentId === activeParentId);
      } else {
        // Root/C4-level mode: preserve existing C4-level filtering behavior
        const navStack = store.navigationStack;
        const currentParent =
          navStack.length > 0
            ? navStack[navStack.length - 1].parentId
            : null;

        filteredElements = elements.filter((el) => {
          // Group and simple nodes are canvas annotations — always visible at the current level/parent
          if (el.type === 'group' || el.type === 'simple' || el.type === 'text') {
            if (currentParent !== null) {
              return el.parentId === currentParent;
            }
            return !el.parentId;
          }
          if (el.type !== activeType) return false;
          if (currentParent !== null) {
            return el.parentId === currentParent;
          }
          return true;
        });

        // Fallback: show all top-level elements if none match the active level
        if (filteredElements.filter((el) => el.type !== 'group' && el.type !== 'simple' && el.type !== 'text').length === 0 && currentParent === null) {
          filteredElements = elements.filter((el) => !el.parentId);
        }
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
        const savedFont = savedTextFonts[node.id];
        const savedTextStyle = savedTextStyles[node.id];
        const savedParent = savedNodeParents[node.id];
        return {
          ...node,
          position: saved
            ? { x: saved.x, y: saved.y }
            : layoutPos ?? node.position,
          ...(savedParent ? { parentId: savedParent.parentId, extent: savedParent.extent } : {}),
          data: {
            ...node.data,
            ...(node.type === 'group' ? { label: node.data.name } : {}),
            ...(node.type === 'simple' ? { label: node.data.name, onLabelChange: (newLabel: string) => {
              const s = useDiagramStore.getState();
              // Update the element name in the store
              const updatedElements = s.allElements.map((el) =>
                el.id === node.id ? { ...el, name: newLabel } : el
              );
              s.setElements(updatedElements, []);
              // Update the node data
              s.setNodes(
                s.nodes.map((n) =>
                  n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n
                ),
              );
            }} : {}),
            ...(node.type === 'text' ? { text: node.data.name || node.data.text || 'Text', onTextChange: (newText: string) => {
              const s = useDiagramStore.getState();
              s.updateElement(node.id, { name: newText });
              s.setNodes(
                s.nodes.map((n) =>
                  n.id === node.id ? { ...n, data: { ...n.data, text: newText } } : n
                ),
              );
            }} : {}),
            ...(savedColor ? { customColor: savedColor } : {}),
            ...(savedFont ? { font: savedFont } : {}),
            ...(savedTextStyle ?? {}),
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

      // Group nodes must come before their children in the array (ReactFlow requirement)
      const sortedNodes = [...positionedNodes].sort((a, b) => {
        if (a.type === 'group' && b.type !== 'group') return -1;
        if (a.type !== 'group' && b.type === 'group') return 1;
        return 0;
      });

      store.setNodes(sortedNodes);

      // Restore edges: prefer directly saved edges, fall back to relationship-derived edges
      // Filter to only edges whose source AND target are on the current sheet
      const currentNodeIds = new Set(sortedNodes.map((n) => n.id));
      let finalEdges: ReactFlowEdge[];
      if (savedEdges !== undefined) {
        // Use directly saved edges for full fidelity (handles, multiple edges per pair).
        // An empty array is valid — it means the user deleted all edges.
        finalEdges = savedEdges
          .filter((e) => currentNodeIds.has(e.source) && currentNodeIds.has(e.target))
          .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type ?? 'smoothstep',
          label: e.label,
          data: { hasWarning: false },
          ...(e.markerEnd ? { markerEnd: { ...e.markerEnd, type: e.markerEnd.type === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow } } : {}),
          ...(e.markerStart ? { markerStart: { ...e.markerStart, type: e.markerStart.type === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow } } : {}),
        }));
      } else {
        // Backward compatibility: derive edges from element relationships + apply saved styles
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
        finalEdges = styledEdges.filter(
          (e) => currentNodeIds.has(e.source) && currentNodeIds.has(e.target)
        );
      }
      store.setEdges(finalEdges);
    },
    []
  );

  // Keep the ref in sync so callbacks defined before renderElements can call it
  renderElementsRef.current = renderElements;

  /**
   * Renders elements using workspace-level saved data from the store.
   * Used for "first visit" sheet renders where sheetNodeData is empty.
   */
  const renderElementsWithSavedData = useCallback(
    async (elements: ArchitectureElement[]) => {
      const s = useDiagramStore.getState();
      await renderElements(
        elements,
        s.savedPositions,
        s.savedEdgeStyles,
        s.savedNodeColors,
        s.savedTextFonts,
        s.savedTextStyles as Record<string, { fontSize?: number; textColor?: string; fontWeight?: 'normal' | 'bold'; fontStyle?: 'normal' | 'italic'; textAlign?: 'left' | 'center' | 'right' | 'justify'; fontFamily?: string }>,
        s.savedNodeParents,
        s.savedEdges as Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; type?: string; label?: string; markerEnd?: { type: string; width?: number; height?: number; color?: string }; markerStart?: { type: string; width?: number; height?: number; color?: string } }>,
      );
      // Save the rendered nodes/edges to sheetNodeData for future navigation
      const rendered = useDiagramStore.getState();
      const stack = rendered.subCanvasStack;
      const sheetKey = stack.length === 0 ? 'root' : stack[stack.length - 1].parentId;
      useDiagramStore.setState({
        sheetNodeData: {
          ...rendered.sheetNodeData,
          [sheetKey]: { nodes: rendered.nodes, edges: rendered.edges },
        },
      });
    },
    [renderElements],
  );

  // Keep the ref in sync for callbacks that need the saved-data version
  renderElementsRef.current = renderElementsWithSavedData;

  /**
   * Loads a workspace file into the store and renders it.
   */
  const loadWorkspace = useCallback(
    async (workspace: WorkspaceFile, handle: FileSystemFileHandle) => {
      const store = useDiagramStore.getState();

      // Use the actual file name (without extension) as the display name
      const fileName = handle.name.replace(/\.c4\.json$/i, '').replace(/\.json$/i, '');
      store.setFileHandle(handle, fileName || workspace.name);
      store.setElements(workspace.elements, []);

      // Validate subCanvasStack: filter out entries referencing deleted elements
      const elementIds = new Set(workspace.elements.map((el) => el.id));
      const rawStack = workspace.subCanvasStack ?? [];
      const validatedStack = rawStack.filter((entry) => elementIds.has(entry.parentId));

      // Determine the active sheet's viewport
      const restoredSheetViewports = workspace.sheetViewports ?? {};
      const activeSheetKey =
        validatedStack.length > 0
          ? validatedStack[validatedStack.length - 1].parentId
          : 'root';
      const activeViewport =
        restoredSheetViewports[activeSheetKey] ?? workspace.viewport;

      useDiagramStore.setState({
        activeLevel: workspace.activeLevel,
        navigationStack: workspace.navigationStack,
        viewport: activeViewport,
        subCanvasStack: validatedStack,
        sheetViewports: restoredSheetViewports,
        subLayerLabels: workspace.subLayerLabels ?? {},
        // Store workspace-level saved data for first-render of any sheet
        savedPositions: workspace.positions ?? {},
        savedEdges: workspace.edges ?? [],
        savedNodeColors: workspace.nodeColors ?? {},
        savedTextFonts: workspace.textFonts ?? {},
        savedTextStyles: workspace.textStyles ?? {},
        savedNodeParents: workspace.nodeParents ?? {},
        savedEdgeStyles: workspace.edgeStyles ?? {},
      });

      await renderElements(workspace.elements, workspace.positions ?? {}, workspace.edgeStyles ?? {}, workspace.nodeColors ?? {}, workspace.textFonts ?? {}, workspace.textStyles ?? {}, workspace.nodeParents ?? {}, workspace.edges);

      // Save the just-rendered nodes/edges to sheetNodeData so navigating away and back preserves them
      const renderedStore = useDiagramStore.getState();
      useDiagramStore.setState({
        sheetNodeData: {
          ...renderedStore.sheetNodeData,
          [activeSheetKey]: { nodes: renderedStore.nodes, edges: renderedStore.edges },
        },
      });

      store.setViewport(activeViewport);
      clearHistory();
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

  /** Captures current node font choices from the store. */
  const captureTextFonts = useCallback(() => {
    const store = useDiagramStore.getState();
    const textFonts: Record<string, 'default' | 'virgil'> = {};
    for (const node of store.nodes) {
      const font = node.data.font as 'default' | 'virgil' | undefined;
      if (font && font !== 'virgil') textFonts[node.id] = font;
    }
    return textFonts;
  }, []);

  /** Captures text node styles from the store. */
  const captureTextStyles = useCallback(() => {
    const store = useDiagramStore.getState();
    const textStyles: Record<string, { fontSize?: number; textColor?: string; fontWeight?: 'normal' | 'bold'; fontStyle?: 'normal' | 'italic'; textAlign?: 'left' | 'center' | 'right' | 'justify'; fontFamily?: string }> = {};
    for (const node of store.nodes) {
      if (node.type === 'text') {
        const style: Record<string, unknown> = {};
        if (node.data.fontSize !== undefined && node.data.fontSize !== 14) style.fontSize = node.data.fontSize;
        if (node.data.textColor !== undefined && node.data.textColor !== '#1e293b') style.textColor = node.data.textColor;
        if (node.data.fontWeight !== undefined && node.data.fontWeight !== 'normal') style.fontWeight = node.data.fontWeight;
        if (node.data.fontStyle !== undefined && node.data.fontStyle !== 'normal') style.fontStyle = node.data.fontStyle;
        if (node.data.textAlign !== undefined && node.data.textAlign !== 'left') style.textAlign = node.data.textAlign;
        if (node.data.fontFamily !== undefined && node.data.fontFamily !== 'virgil') style.fontFamily = node.data.fontFamily;
        if (Object.keys(style).length > 0) textStyles[node.id] = style as typeof textStyles[string];
      }
    }
    return textStyles;
  }, []);

  /** Captures parentId/extent for grouped nodes. */
  const captureNodeParents = useCallback(() => {
    const store = useDiagramStore.getState();
    const nodeParents: Record<string, { parentId: string; extent?: 'parent' }> = {};
    for (const node of store.nodes) {
      if (node.parentId) {
        nodeParents[node.id] = {
          parentId: node.parentId,
          ...(node.extent === 'parent' ? { extent: 'parent' as const } : {}),
        };
      }
    }
    return nodeParents;
  }, []);

  /**
   * Collects ALL nodes across every sheet (current + sheetNodeData).
   * This ensures save captures positions/colors/fonts for nodes on all sheets,
   * not just the currently visible sheet.
   */
  const collectAllSheetNodes = useCallback(() => {
    const store = useDiagramStore.getState();
    const allNodes: ReactFlowNode[] = [...store.nodes];
    const allEdges: ReactFlowEdge[] = [...store.edges];

    // Add nodes/edges from other sheets stored in sheetNodeData
    const currentNodeIds = new Set(store.nodes.map((n) => n.id));
    const currentEdgeIds = new Set(store.edges.map((e) => e.id));

    for (const sheetData of Object.values(store.sheetNodeData)) {
      for (const node of sheetData.nodes) {
        if (!currentNodeIds.has(node.id)) {
          allNodes.push(node);
          currentNodeIds.add(node.id);
        }
      }
      for (const edge of sheetData.edges) {
        if (!currentEdgeIds.has(edge.id)) {
          allEdges.push(edge);
          currentEdgeIds.add(edge.id);
        }
      }
    }

    return { allNodes, allEdges };
  }, []);

  /**
   * Builds the current WorkspaceFile from store state for saving.
   * Captures node positions from ALL sheets so they persist across save/open.
   */
  const buildWorkspaceFile = useCallback((): WorkspaceFile => {
    const store = useDiagramStore.getState();
    const { allNodes, allEdges } = collectAllSheetNodes();

    // Capture positions from all sheets' nodes
    const positions: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
    for (const node of allNodes) {
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
    for (const edge of allEdges) {
      edgeStyles[edge.id] = {
        ...(edge.type ? { type: edge.type } : {}),
        ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
        ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
      };
    }

    const nodeColors: Record<string, string> = {};
    const textFonts: Record<string, 'default' | 'virgil'> = {};
    const textStyles: Record<string, { fontSize?: number; textColor?: string; fontWeight?: 'normal' | 'bold'; fontStyle?: 'normal' | 'italic'; textAlign?: 'left' | 'center' | 'right' | 'justify'; fontFamily?: string }> = {};
    const nodeParents: Record<string, { parentId: string; extent?: 'parent' }> = {};
    for (const node of allNodes) {
      const color = node.data.customColor as string | undefined;
      if (color) nodeColors[node.id] = color;
      const font = node.data.font as 'default' | 'virgil' | undefined;
      if (font && font !== 'virgil') textFonts[node.id] = font;
      // Capture text node styling
      if (node.type === 'text') {
        const style: Record<string, unknown> = {};
        if (node.data.fontSize !== undefined && node.data.fontSize !== 14) style.fontSize = node.data.fontSize;
        if (node.data.textColor !== undefined && node.data.textColor !== '#1e293b') style.textColor = node.data.textColor;
        if (node.data.fontWeight !== undefined && node.data.fontWeight !== 'normal') style.fontWeight = node.data.fontWeight;
        if (node.data.fontStyle !== undefined && node.data.fontStyle !== 'normal') style.fontStyle = node.data.fontStyle;
        if (node.data.textAlign !== undefined && node.data.textAlign !== 'left') style.textAlign = node.data.textAlign;
        if (node.data.fontFamily !== undefined && node.data.fontFamily !== 'virgil') style.fontFamily = node.data.fontFamily;
        if (Object.keys(style).length > 0) textStyles[node.id] = style as typeof textStyles[string];
      }
      if (node.parentId) {
        nodeParents[node.id] = {
          parentId: node.parentId,
          ...(node.extent === 'parent' ? { extent: 'parent' as const } : {}),
        };
      }
    }

    return {
      version: 1,
      name: store.workspaceName ?? 'Untitled',
      elements: store.allElements.map((el) => {
        // Sync element.relationships to match the actual saved edges.
        // This prevents stale relationships from creating phantom edges on restore.
        const elEdges = allEdges.filter((e) => e.source === el.id);
        // Deduplicate by targetId (multiple edges to same target via different handles = one relationship)
        const targetMap = new Map<string, { targetId: string; label?: string }>();
        for (const e of elEdges) {
          if (!targetMap.has(e.target)) {
            targetMap.set(e.target, {
              targetId: e.target,
              ...(e.label ? { label: e.label as string } : {}),
            });
          }
        }
        return { ...el, relationships: Array.from(targetMap.values()) };
      }),
      positions,
      edgeStyles,
      nodeColors,
      textFonts,
      textStyles,
      nodeParents,
      edges: allEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
        ...(e.type ? { type: e.type } : {}),
        ...(e.label ? { label: e.label as string } : {}),
        ...(e.markerEnd && typeof e.markerEnd === 'object' ? { markerEnd: e.markerEnd } : {}),
        ...(e.markerStart && typeof e.markerStart === 'object' ? { markerStart: e.markerStart } : {}),
      })),
      viewport: store.viewport,
      activeLevel: store.activeLevel,
      navigationStack: store.navigationStack,
      subCanvasStack: store.subCanvasStack,
      sheetViewports: store.sheetViewports,
      subLayerLabels: store.subLayerLabels,
    };
  }, [collectAllSheetNodes]);

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

        // Use buildWorkspaceFile to capture ALL sheets' data consistently
        const workspace = buildWorkspaceFile();
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
  }, [buildWorkspaceFile]);

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
      subCanvasStack: [],
      sheetViewports: {},
      sheetNodeData: {},
      subLayerLabels: {},
    });

    clearWorkspaceState().catch(() => {});
    clearHistory();
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
          const fileName = newHandle.name.replace(/\.c4\.json$/i, '').replace(/\.json$/i, '');
          useDiagramStore.setState({ fileHandle: newHandle, workspaceName: fileName || workspace.name });
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
        // Update the file handle and display the new file name
        const fileName = newHandle.name.replace(/\.c4\.json$/i, '').replace(/\.json$/i, '');
        useDiagramStore.setState({ fileHandle: newHandle, workspaceName: fileName || workspace.name });
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

      // Place the new element at the center of the current viewport
      const center = getCanvasCenter(-125, -75);
      currentPositions[id] = { x: center.x, y: center.y };

      store.addElement(element);

      const currentEdgeStyles = captureEdgeStyles();
      const currentNodeColors = captureNodeColors();
      const currentTextFonts = captureTextFonts();

      // Re-render, preserving existing positions and edge styles
      await renderElements(useDiagramStore.getState().allElements, currentPositions, currentEdgeStyles, currentNodeColors, currentTextFonts, captureTextStyles(), captureNodeParents());

      toast.success('Element created');
    },
    [currentParentId, renderElements, getCanvasCenter]
  );

  const handleAddSimpleNode = useCallback(() => {
    const store = useDiagramStore.getState();
    const id = generateId();

    // Create the element so it persists in allElements
    const element: ArchitectureElement = {
      id,
      type: 'simple',
      name: 'Simple Node',
      description: '',
      ...(currentParentId ? { parentId: currentParentId } : {}),
      relationships: [],
    };

    store.addElement(element);

    const center = getCanvasCenter(-110, -40);

    const newNode: ReactFlowNode = {
      id,
      type: 'simple',
      position: { x: center.x, y: center.y },
      data: {
        label: 'Simple Node',
        description: '',
        onLabelChange: (newLabel: string) => {
          const s = useDiagramStore.getState();
          const updatedElements = s.allElements.map((el) =>
            el.id === id ? { ...el, name: newLabel } : el
          );
          s.setElements(updatedElements, []);
          s.setNodes(
            s.nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n,
            ),
          );
        },
      },
    };

    store.setNodes([...store.nodes, newNode]);
  }, [currentParentId, getCanvasCenter]);

  const handleAddTextNode = useCallback(() => {
    const store = useDiagramStore.getState();
    const id = generateId();

    const element: ArchitectureElement = {
      id,
      type: 'text',
      name: 'Text',
      description: '',
      ...(currentParentId ? { parentId: currentParentId } : {}),
      relationships: [],
    };

    store.addElement(element);

    const center = getCanvasCenter(-100, -30);

    const newNode: ReactFlowNode = {
      id,
      type: 'text',
      position: { x: center.x, y: center.y },
      style: { width: 200, height: 60 },
      data: {
        text: 'Text',
        fontSize: 14,
        textColor: '#1e293b',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        fontFamily: 'virgil',
        onTextChange: (newText: string) => {
          const s = useDiagramStore.getState();
          s.updateElement(id, { name: newText });
          s.setNodes(
            s.nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, text: newText } } : n,
            ),
          );
        },
      },
    };

    store.setNodes([...store.nodes, newNode]);
  }, [currentParentId, getCanvasCenter]);

  // Copy/paste clipboard ref — holds copied node+element pairs
  const clipboardRef = useRef<Array<{ node: ReactFlowNode; element: ArchitectureElement }>>([]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+S / Cmd+S — save to file (works even when focused on inputs)
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+Z / Cmd+Z — undo (works even when focused on inputs)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        const result = undo();
        if (result === 'empty') toast.info('Nothing to undo');
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo (works even when focused on inputs)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        const result = redo();
        if (result === 'empty') toast.info('Nothing to redo');
        return;
      }

      // Ctrl+Y / Cmd+Y — redo alternative
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const result = redo();
        if (result === 'empty') toast.info('Nothing to redo');
        return;
      }

      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        const store = useDiagramStore.getState();
        const selectedNodes = store.nodes.filter((n) => (n as ReactFlowNode & { selected?: boolean }).selected);
        if (selectedNodes.length === 0) return;

        clipboardRef.current = selectedNodes.map((n) => ({
          node: n,
          element: store.allElements.find((el) => el.id === n.id)!,
        })).filter((item) => item.element);
      }

      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        if (clipboardRef.current.length === 0) return;
        const store = useDiagramStore.getState();
        const OFFSET = 24;

        const newNodes: ReactFlowNode[] = [];
        const newElements: ArchitectureElement[] = [];

        for (const { node, element } of clipboardRef.current) {
          const newId = generateId();
          newElements.push({
            ...element,
            id: newId,
            relationships: [],
          });
          newNodes.push({
            ...node,
            id: newId,
            position: { x: node.position.x + OFFSET, y: node.position.y + OFFSET },
            selected: true,
            data: { ...node.data, autoFocus: false },
          });
        }

        // Deselect old nodes, add new ones
        const deselected = store.nodes.map((n) => ({ ...n, selected: false }));
        store.setNodes([...deselected, ...newNodes]);
        for (const el of newElements) store.addElement(el);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

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
                const fileName = savedHandle.name.replace(/\.c4\.json$/i, '').replace(/\.json$/i, '');
                useDiagramStore.getState().setFileHandle(savedHandle, fileName || cachedState.name);
              }
            } catch {
              // Permission denied — still restore state, just can't save to file
            }
          }

          // Load from cached state (preserves unsaved changes)
          const store = useDiagramStore.getState();
          store.setElements(cachedState.elements, []);

          // Validate subCanvasStack: filter out entries referencing deleted elements
          const elementIds = new Set(cachedState.elements.map((el: ArchitectureElement) => el.id));
          const rawStack = cachedState.subCanvasStack ?? [];
          const validatedStack = rawStack.filter((entry: { parentId: string }) => elementIds.has(entry.parentId));

          // Determine the active sheet's viewport
          const restoredSheetViewports = cachedState.sheetViewports ?? {};
          const activeSheetKey =
            validatedStack.length > 0
              ? validatedStack[validatedStack.length - 1].parentId
              : 'root';
          const activeViewport =
            restoredSheetViewports[activeSheetKey] ?? cachedState.viewport ?? { x: 0, y: 0, zoom: 1 };

          useDiagramStore.setState({
            workspaceName: useDiagramStore.getState().workspaceName ?? cachedState.name,
            activeLevel: cachedState.activeLevel ?? 'L1',
            navigationStack: cachedState.navigationStack ?? [],
            viewport: activeViewport,
            subCanvasStack: validatedStack,
            sheetViewports: restoredSheetViewports,
            subLayerLabels: cachedState.subLayerLabels ?? {},
            // Store workspace-level saved data for first-render of any sheet
            savedPositions: cachedState.positions ?? {},
            savedEdges: cachedState.edges ?? [],
            savedNodeColors: cachedState.nodeColors ?? {},
            savedTextFonts: cachedState.textFonts ?? {},
            savedTextStyles: cachedState.textStyles ?? {},
            savedNodeParents: cachedState.nodeParents ?? {},
            savedEdgeStyles: cachedState.edgeStyles ?? {},
          });

          await renderElements(cachedState.elements, cachedState.positions ?? {}, cachedState.edgeStyles ?? {}, cachedState.nodeColors ?? {}, cachedState.textFonts ?? {}, cachedState.textStyles ?? {}, cachedState.nodeParents ?? {}, cachedState.edges);

          // Save the just-rendered nodes/edges to sheetNodeData so navigating away and back preserves them
          const renderedStore = useDiagramStore.getState();
          useDiagramStore.setState({
            sheetNodeData: {
              ...renderedStore.sheetNodeData,
              [activeSheetKey]: { nodes: renderedStore.nodes, edges: renderedStore.edges },
            },
          });

          store.setViewport(activeViewport);

          toast.success(`Restored "${cachedState.name}"`);
          setIsLoading(false);
          clearHistory();
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
    <div className="flex h-screen w-screen">
      {/* Persistent sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onAddSimpleNode={handleAddSimpleNode}
        onAddTextNode={handleAddTextNode}
        onCreateElement={handleCreateElement}
        currentLevel={activeLevel}
        parentId={currentParentId}
        isSupported={isSupported}
        isSavingFile={isSavingToFile}
        elements={allElements}
        subLayerLabels={subLayerLabels}
        activeParentId={currentParentId ?? null}
        onNavigateToNode={async (nodeId: string) => {
          const store = useDiagramStore.getState();
          const stack = store.subCanvasStack;

          // Already viewing this node's sub-canvas — do nothing
          if (stack.length > 0 && stack[stack.length - 1].parentId === nodeId) {
            return;
          }

          // Check if this node is already in the stack — navigate to it instead of pushing a duplicate
          const existingIndex = stack.findIndex((entry) => entry.parentId === nodeId);
          if (existingIndex >= 0) {
            store.navigateToSheet(existingIndex);
            const updated = useDiagramStore.getState();
            if (updated.nodes.length === 0) {
              await renderElementsWithSavedData(updated.allElements);
            }
            setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
            return;
          }

          // Navigate to the node's sub-canvas
          store.navigateToSubCanvas(nodeId);
          const updated = useDiagramStore.getState();
          if (updated.nodes.length === 0) {
            await renderElementsWithSavedData(updated.allElements);
          }
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        }}
        onNavigateToRoot={async () => {
          useDiagramStore.getState().navigateToRoot();
          const store = useDiagramStore.getState();
          if (store.nodes.length === 0) {
            await renderElementsWithSavedData(store.allElements);
          }
          setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
        }}
        onAddSubLayer={(parentNodeId: string, parentNodeName: string) => {
          // Open the sublayer naming dialog for a nested sublayer
          setSubLayerDialog({ nodeId: parentNodeId, nodeName: parentNodeName });
        }}
        onDeleteSubLayer={async (nodeId: string) => {
          const store = useDiagramStore.getState();

          // If we're currently viewing this sublayer or any nested one, navigate to root first
          const stack = store.subCanvasStack;
          const isViewing = stack.some((entry) => entry.parentId === nodeId);

          // Collect all descendant element IDs recursively
          const childIds = new Set<string>();
          function collectChildren(parentId: string) {
            for (const el of store.allElements) {
              if (el.parentId === parentId && !childIds.has(el.id)) {
                childIds.add(el.id);
                collectChildren(el.id);
              }
            }
          }
          collectChildren(nodeId);

          // Also check if we're viewing any nested sublayer
          const isViewingNested = !isViewing && stack.some(
            (entry) => childIds.has(entry.parentId)
          );

          if (isViewing || isViewingNested) {
            store.navigateToRoot();
          }

          // Remove sublayer labels for the deleted node AND all its descendants
          const labelsToRemove = new Set<string>([nodeId, ...childIds]);
          const remainingLabels: Record<string, string> = {};
          for (const [id, label] of Object.entries(store.subLayerLabels)) {
            if (!labelsToRemove.has(id)) {
              remainingLabels[id] = label;
            }
          }
          useDiagramStore.setState({ subLayerLabels: remainingLabels });

          // Remove all child elements that belong to this sublayer
          if (childIds.size > 0) {
            const filtered = store.allElements.filter((el) => !childIds.has(el.id));
            store.setElements(filtered, store.parseErrors);
          }

          // Re-render if we navigated away
          if (isViewing || isViewingNested) {
            const updated = useDiagramStore.getState();
            if (updated.nodes.length === 0) {
              await renderElementsWithSavedData(updated.allElements);
            }
            setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
          }

          toast.success('Sub layer deleted');
        }}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex-shrink-0 px-3 py-2 bg-white border-b border-slate-200 z-10">
          <Toolbar
            isSupported={isSupported}
            workspaceName={workspaceName}
            isSavingCache={isSaving}
            isSavingFile={isSavingToFile}
          />
        </div>

      {/* Breadcrumb navigation */}
      {(navigationStack.length > 0 || subCanvasStack.length > 0) && (
        <div className="flex-shrink-0 px-3 py-2 bg-white border-b border-slate-200">
          <Breadcrumb
            stack={navigationStack}
            onNavigate={async (index: number) => {
              useDiagramStore.getState().navigateToBreadcrumb(index);
              const store = useDiagramStore.getState();
              await renderElements(
                store.allElements,
                capturePositions(),
                captureEdgeStyles(),
                captureNodeColors(),
                captureTextFonts(),
                captureTextStyles(),
                captureNodeParents(),
              );
            }}
            subCanvasStack={subCanvasStack}
            onSubCanvasNavigate={async (index: number) => {
              // Store saves current nodes/edges and restores target sheet's state
              useDiagramStore.getState().navigateToSheet(index);
              const store = useDiagramStore.getState();
              // Only call renderElements for first visit (no saved nodes for this sheet)
              if (store.nodes.length === 0) {
                await renderElementsWithSavedData(store.allElements);
              }
              // Fit view so the user can see all nodes on the target sheet
              setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
            }}
          />
        </div>
      )}

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
          <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
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
          onSelectionContextMenu={handleSelectionContextMenu}
          onMoveEnd={handleViewportChange}
          edgeUpdaterRadius={20}
          connectionRadius={40}
          connectionMode={ConnectionMode.Loose}
          onPaneClick={() => { setEdgeMenu(null); setNodeMenu(null); setSelectionMenu(null); }}
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

      {/* Sheet tab bar for sub-canvas navigation */}
      {subCanvasStack.length > 0 && (
        <SheetTabBar
          subCanvasStack={subCanvasStack}
          activeIndex={subCanvasStack.length - 1}
          onSelectSheet={async (index: number) => {
            // Store saves current nodes/edges and restores target sheet's state
            useDiagramStore.getState().navigateToSheet(index);
            const store = useDiagramStore.getState();
            // Only call renderElements for first visit (no saved nodes for this sheet)
            if (store.nodes.length === 0) {
              await renderElementsWithSavedData(store.allElements);
            }
            // Fit view so the user can see all nodes on the target sheet
            setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
          }}
        />
      )}
      </div>

      {/* Right-side properties panel */}
      <PropertiesPanel
        isOpen={propertiesPanelOpen}
        onToggle={() => setPropertiesPanelOpen((prev) => !prev)}
        selectedNode={selectedNode}
        element={selectedElement}
        onUpdateElement={handleUpdateElement}
        onUpdateNodePosition={handleUpdateNodePosition}
        onUpdateNodeSize={handleUpdateNodeSize}
        onUpdateNodeColor={handleUpdateNodeColor}
        onUpdateNodeFont={handleUpdateNodeFont}
        onUpdateNodeData={handleUpdateNodeData}
      />

      <Toaster position="bottom-right" />

      {/* Edge context menu */}
      {edgeMenu && (
        <EdgeContextMenu
          x={edgeMenu.x}
          y={edgeMenu.y}
          edgeId={edgeMenu.edgeId}
          currentType={edgeMenu.edgeType}
          currentArrow={edgeMenu.arrowStyle}
          onChangeType={handleChangeEdgeType}
          onChangeArrow={handleChangeArrowStyle}
          onClose={() => setEdgeMenu(null)}
        />
      )}

      {/* Node context menu */}
      {nodeMenu && (
        <NodeContextMenu
          x={nodeMenu.x}
          y={nodeMenu.y}
          nodeId={nodeMenu.nodeId}
          nodeType={nodeMenu.nodeType}
          currentColor={nodeMenu.currentColor}
          onChangeColor={handleChangeNodeColor}
          onUngroup={handleUngroup}
          onCreateSubLevel={async (nodeId: string) => {
            // Open the sublayer naming dialog instead of navigating immediately
            const store = useDiagramStore.getState();
            const element = store.allElements.find((el) => el.id === nodeId);
            setSubLayerDialog({
              nodeId,
              nodeName: element?.name ?? 'Node',
            });
          }}
          onClose={() => setNodeMenu(null)}
        />
      )}

      {selectionMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSelectionMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
          >
            <button
              type="button"
              onClick={() => handleGroupSelected(selectionMenu.nodeIds)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-4 w-4 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <path d="M7 7h4v4H7z" /><path d="M13 13h4v4h-4z" />
              </svg>
              Group selection
            </button>
          </div>
        </>
      )}

      {/* Create sub layer dialog */}
      {subLayerDialog && (
        <CreateSubLayerDialog
          parentNodeName={subLayerDialog.nodeName}
          onSubmit={async (name: string) => {
            const nodeId = subLayerDialog.nodeId;
            setSubLayerDialog(null);
            // Navigate to the sub-canvas with the user-provided name as the tab label
            useDiagramStore.getState().navigateToSubCanvas(nodeId, name);
            const store = useDiagramStore.getState();
            // Only call renderElements for first visit (no saved nodes for this sheet)
            if (store.nodes.length === 0) {
              await renderElementsWithSavedData(store.allElements);
            }
            // Fit view so the user can see all nodes on the target sheet
            setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
          }}
          onCancel={() => setSubLayerDialog(null)}
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
