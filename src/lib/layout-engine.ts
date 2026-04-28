import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type {
  LayoutInput,
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  BoundaryGroup,
  EdgeSection,
} from '@/types/layout';

const elk = new ELK();

const ELK_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.spacing.nodeNode': '50',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.componentComponent': '50',
};

const LAYOUT_TIMEOUT_MS = 5000;

const GRID_H_GAP = 250;
const GRID_V_GAP = 200;

/**
 * Arranges nodes in a simple grid pattern as a fallback
 * when ELK layout fails or times out.
 */
export function gridFallbackLayout(input: LayoutInput): LayoutResult {
  const cols = Math.max(1, Math.ceil(Math.sqrt(input.nodes.length)));

  const nodeResults = input.nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      id: node.id,
      x: col * GRID_H_GAP,
      y: row * GRID_V_GAP,
    };
  });

  const edgeResults = input.edges.map((edge) => ({
    id: edge.id,
    sections: [] as EdgeSection[],
  }));

  return { nodes: nodeResults, edges: edgeResults };
}

/**
 * Builds an ELK graph structure from the layout input.
 * Boundary groups become parent ELK nodes containing their children.
 */
function buildElkGraph(input: LayoutInput): {
  id: string;
  layoutOptions: Record<string, string>;
  children: ElkNode[];
  edges: ElkExtendedEdge[];
} {
  const { nodes, edges, boundaryGroups } = input;

  // Build a set of node IDs that belong to a boundary group
  const childToBoundary = new Map<string, string>();
  for (const group of boundaryGroups) {
    for (const childId of group.childIds) {
      childToBoundary.set(childId, group.id);
    }
  }

  // Build a lookup for nodes by id
  const nodeMap = new Map<string, LayoutNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Create ELK nodes for boundary groups with their children nested inside
  const boundaryElkNodes: ElkNode[] = boundaryGroups.map((group) => {
    const children: ElkNode[] = group.childIds
      .filter((childId) => nodeMap.has(childId))
      .map((childId) => {
        const node = nodeMap.get(childId)!;
        return {
          id: node.id,
          width: node.width,
          height: node.height,
        };
      });

    return {
      id: group.id,
      width: 0,
      height: 0,
      layoutOptions: {
        'elk.padding': '[top=40,left=20,bottom=20,right=20]',
      },
      children,
    };
  });

  // Create ELK nodes for nodes that are NOT in any boundary group
  const topLevelElkNodes: ElkNode[] = nodes
    .filter((node) => !childToBoundary.has(node.id))
    .map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
    }));

  // Create ELK edges
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  return {
    id: 'root',
    layoutOptions: ELK_LAYOUT_OPTIONS,
    children: [...topLevelElkNodes, ...boundaryElkNodes],
    edges: elkEdges,
  };
}

/**
 * Extracts computed positions from the ELK layout result,
 * mapping them back to a LayoutResult.
 */
function extractLayoutResult(
  elkResult: ElkNode,
  input: LayoutInput
): LayoutResult {
  const nodePositions: Array<{ id: string; x: number; y: number }> = [];

  function extractNodes(elkNode: ElkNode, offsetX = 0, offsetY = 0) {
    if (elkNode.children) {
      for (const child of elkNode.children) {
        const x = (child.x ?? 0) + offsetX;
        const y = (child.y ?? 0) + offsetY;

        // Check if this child is a boundary group (has its own children)
        if (child.children && child.children.length > 0) {
          // Record the boundary group node position
          nodePositions.push({ id: child.id, x, y });
          // Recurse into boundary group children with offset
          extractNodes(child, x, y);
        } else {
          nodePositions.push({ id: child.id, x, y });
        }
      }
    }
  }

  extractNodes(elkResult);

  // Extract edge sections
  const edgeResults: Array<{ id: string; sections: EdgeSection[] }> = [];

  if (elkResult.edges) {
    for (const elkEdge of elkResult.edges) {
      const sections: EdgeSection[] = [];
      const extEdge = elkEdge as ElkExtendedEdge;

      if (extEdge.sections) {
        for (const section of extEdge.sections) {
          sections.push({
            startPoint: {
              x: section.startPoint.x,
              y: section.startPoint.y,
            },
            endPoint: {
              x: section.endPoint.x,
              y: section.endPoint.y,
            },
            bendPoints: section.bendPoints?.map((bp) => ({
              x: bp.x,
              y: bp.y,
            })),
          });
        }
      }

      edgeResults.push({ id: extEdge.id, sections });
    }
  }

  // For any edges in input that didn't get sections, add empty entries
  const edgeIdSet = new Set(edgeResults.map((e) => e.id));
  for (const edge of input.edges) {
    if (!edgeIdSet.has(edge.id)) {
      edgeResults.push({ id: edge.id, sections: [] });
    }
  }

  return { nodes: nodePositions, edges: edgeResults };
}

/**
 * Wraps a promise with a timeout. Rejects if the promise
 * doesn't resolve within the specified milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Layout computation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Computes layout positions for all nodes and edge routes using ELK.js.
 * Falls back to a grid layout on timeout or error.
 */
export async function computeLayout(
  input: LayoutInput
): Promise<LayoutResult> {
  // Handle empty input
  if (input.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  try {
    const elkGraph = buildElkGraph(input);
    const result = await withTimeout(
      elk.layout(elkGraph),
      LAYOUT_TIMEOUT_MS
    );
    return extractLayoutResult(result, input);
  } catch {
    // Fall back to grid layout on any error or timeout
    return gridFallbackLayout(input);
  }
}
