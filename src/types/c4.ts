/**
 * Core C4 model types for the architecture diagramming platform.
 *
 * C4 Type to Level Mapping:
 * - system    → L1 (System Context)
 * - container → L2 (Containers within a system)
 * - component → L3 (Components within a container)
 * - code      → L4 (Code units within a component)
 */

/** The four C4 element types */
export type C4Type = 'system' | 'container' | 'component' | 'code';

/** The four C4 hierarchy levels */
export type C4Level = 'L1' | 'L2' | 'L3' | 'L4';

/** A directed relationship from one element to another */
export interface Relationship {
  targetId: string;
  label?: string;
  technology?: string;
}

/** Core data structure representing a single C4 element parsed from an architecture file */
export interface ArchitectureElement {
  id: string;
  type: C4Type;
  name: string;
  description: string;
  technology?: string;
  parentId?: string;
  boundary?: string;
  relationships: Relationship[];
}

/** Data passed to custom React Flow node components via the `data` prop */
export interface C4NodeData {
  name: string;
  description: string;
  technology?: string;
  c4Type: C4Type;
  hasChildren: boolean;
  customColor?: string;
  onDrillDown: (nodeId: string) => void;
  onEdit: (nodeId: string) => void;
}
