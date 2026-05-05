import type { NodeTypes } from 'reactflow';
import SystemNode from './SystemNode';
import ContainerNode from './ContainerNode';
import ComponentNode from './ComponentNode';
import CodeNode from './CodeNode';
import BoundaryGroupNode from './BoundaryGroupNode';
import LabeledGroupNode from './LabeledGroupNode';

/**
 * Node type registry for React Flow's `nodeTypes` prop.
 * Defined at module scope so the object reference is stable across renders.
 * Maps C4 element types to their custom node components.
 */
export const nodeTypes: NodeTypes = {
  system: SystemNode,
  container: ContainerNode,
  component: ComponentNode,
  code: CodeNode,
  boundary: BoundaryGroupNode,
  group: LabeledGroupNode,
};

/**
 * Default edge options for React Flow.
 * Uses smoothstep edges for orthogonal (right-angled) routing.
 */
export const defaultEdgeOptions = {
  type: 'smoothstep' as const,
};
