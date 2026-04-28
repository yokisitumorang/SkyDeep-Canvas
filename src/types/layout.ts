/** Input node for the layout engine */
export interface LayoutNode {
  id: string;
  width: number;
  height: number;
  parentId?: string;
}

/** Input edge for the layout engine */
export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

/** A boundary group that visually contains child nodes */
export interface BoundaryGroup {
  id: string;
  label: string;
  childIds: string[];
}

/** Complete input for a layout computation */
export interface LayoutInput {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  boundaryGroups: BoundaryGroup[];
}

/** A single segment of an edge route */
export interface EdgeSection {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  bendPoints?: Array<{ x: number; y: number }>;
}

/** Output of a layout computation with computed positions */
export interface LayoutResult {
  nodes: Array<{ id: string; x: number; y: number }>;
  edges: Array<{ id: string; sections: EdgeSection[] }>;
}
