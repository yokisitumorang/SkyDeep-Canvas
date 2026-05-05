import type { ArchitectureElement } from '@/types/c4';
import type { ReactFlowNode, ReactFlowEdge } from '@/store/diagram-store';

/**
 * Converts a filtered set of ArchitectureElements into React Flow nodes.
 *
 * @param elements - The elements to display (already filtered to the current level/parent)
 * @param allElements - The full set of elements in the workspace (used for hasChildren check)
 * @returns An array of ReactFlowNode objects ready for React Flow rendering
 */
export function elementsToNodes(
  elements: ArchitectureElement[],
  allElements: ArchitectureElement[]
): ReactFlowNode[] {
  return elements.map((element) => {
    const hasChildren = allElements.some(
      (el) => el.parentId === element.id
    );

    return {
      id: element.id,
      type: element.type,
      position: { x: 0, y: 0 },
      data: {
        name: element.name,
        description: element.description,
        technology: element.technology,
        c4Type: element.type,
        hasChildren,
        ...(element.type === 'simple' ? { label: element.name } : {}),
        ...(element.type === 'text' ? { text: element.name } : {}),
        onDrillDown: () => {},
        onEdit: () => {},
      },
    };
  });
}

/**
 * Converts relationships from visible elements into React Flow edges.
 *
 * @param elements - The visible elements whose relationships should be converted
 * @param allElements - The full set of elements in the workspace (used for dangling reference detection)
 * @returns An array of ReactFlowEdge objects ready for React Flow rendering
 */
export function elementsToEdges(
  elements: ArchitectureElement[],
  allElements: ArchitectureElement[]
): ReactFlowEdge[] {
  const edges: ReactFlowEdge[] = [];

  for (const element of elements) {
    for (const relationship of element.relationships) {
      const targetExists = allElements.some(
        (el) => el.id === relationship.targetId
      );

      const edge: ReactFlowEdge = {
        id: `${element.id}-${relationship.targetId}`,
        source: element.id,
        target: relationship.targetId,
        type: 'smoothstep',
        label: relationship.label,
        data: {
          technology: relationship.technology,
          hasWarning: !targetExists,
        },
      };

      edges.push(edge);
    }
  }

  return edges;
}
