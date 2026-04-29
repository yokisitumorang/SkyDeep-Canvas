import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from './diagram-store';
import type { ArchitectureElement } from '@/types/c4';
import type { ParseError } from '@/types/parser';

/** Helper to reset the store to initial state between tests */
function resetStore() {
  useDiagramStore.setState({
    fileHandle: null,
    workspaceName: null,
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
  });
}

/** Factory for creating test ArchitectureElement objects */
function makeElement(overrides: Partial<ArchitectureElement> = {}): ArchitectureElement {
  return {
    id: 'test-id',
    type: 'system',
    name: 'Test System',
    description: 'A test system',
    relationships: [],
    ...overrides,
  };
}

describe('DiagramStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useDiagramStore.getState();
      expect(state.fileHandle).toBeNull();
      expect(state.workspaceName).toBeNull();
      expect(state.allElements).toEqual([]);
      expect(state.parseErrors).toEqual([]);
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.activeLevel).toBe('L1');
      expect(state.navigationStack).toEqual([]);
      expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });
  });

  describe('setFileHandle', () => {
    it('sets the file handle and workspace name', () => {
      const mockHandle = { name: 'my-workspace.c4.json' } as unknown as FileSystemFileHandle;
      useDiagramStore.getState().setFileHandle(mockHandle, 'my-workspace');

      const state = useDiagramStore.getState();
      expect(state.fileHandle).toBe(mockHandle);
      expect(state.workspaceName).toBe('my-workspace');
    });
  });

  describe('setElements', () => {
    it('sets elements and parse errors', () => {
      const elements = [makeElement({ id: 'sys-1' }), makeElement({ id: 'sys-2' })];
      const errors: ParseError[] = [
        { success: false, filePath: 'bad.md', error: 'Invalid YAML' },
      ];

      useDiagramStore.getState().setElements(elements, errors);

      const state = useDiagramStore.getState();
      expect(state.allElements).toHaveLength(2);
      expect(state.allElements[0].id).toBe('sys-1');
      expect(state.parseErrors).toHaveLength(1);
      expect(state.parseErrors[0].filePath).toBe('bad.md');
    });
  });

  describe('setNodes', () => {
    it('sets the nodes array', () => {
      const nodes = [
        { id: 'n1', type: 'system', position: { x: 0, y: 0 }, data: {} },
      ];
      useDiagramStore.getState().setNodes(nodes);
      expect(useDiagramStore.getState().nodes).toEqual(nodes);
    });
  });

  describe('setEdges', () => {
    it('sets the edges array', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', type: 'smoothstep' },
      ];
      useDiagramStore.getState().setEdges(edges);
      expect(useDiagramStore.getState().edges).toEqual(edges);
    });
  });

  describe('setViewport', () => {
    it('sets the viewport', () => {
      useDiagramStore.getState().setViewport({ x: 100, y: 200, zoom: 1.5 });
      expect(useDiagramStore.getState().viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
    });
  });

  describe('addElement', () => {
    it('adds an element to allElements', () => {
      const el = makeElement({ id: 'new-el' });
      useDiagramStore.getState().addElement(el);

      const state = useDiagramStore.getState();
      expect(state.allElements).toHaveLength(1);
      expect(state.allElements[0].id).toBe('new-el');
    });

    it('appends to existing elements', () => {
      useDiagramStore.getState().addElement(makeElement({ id: 'el-1' }));
      useDiagramStore.getState().addElement(makeElement({ id: 'el-2' }));

      const state = useDiagramStore.getState();
      expect(state.allElements).toHaveLength(2);
      expect(state.allElements[0].id).toBe('el-1');
      expect(state.allElements[1].id).toBe('el-2');
    });
  });

  describe('updateElement', () => {
    it('updates an existing element by id', () => {
      useDiagramStore.getState().addElement(makeElement({ id: 'el-1', name: 'Original' }));
      useDiagramStore.getState().updateElement('el-1', { name: 'Updated' });

      const state = useDiagramStore.getState();
      expect(state.allElements[0].name).toBe('Updated');
    });

    it('does not modify other elements', () => {
      useDiagramStore.getState().addElement(makeElement({ id: 'el-1', name: 'First' }));
      useDiagramStore.getState().addElement(makeElement({ id: 'el-2', name: 'Second' }));
      useDiagramStore.getState().updateElement('el-1', { name: 'Updated First' });

      const state = useDiagramStore.getState();
      expect(state.allElements[0].name).toBe('Updated First');
      expect(state.allElements[1].name).toBe('Second');
    });

    it('does nothing when id is not found', () => {
      useDiagramStore.getState().addElement(makeElement({ id: 'el-1', name: 'Original' }));
      useDiagramStore.getState().updateElement('nonexistent', { name: 'Nope' });

      const state = useDiagramStore.getState();
      expect(state.allElements).toHaveLength(1);
      expect(state.allElements[0].name).toBe('Original');
    });
  });

  describe('removeElement', () => {
    it('removes an element by id', () => {
      useDiagramStore.getState().addElement(makeElement({ id: 'el-1' }));
      useDiagramStore.getState().addElement(makeElement({ id: 'el-2' }));
      useDiagramStore.getState().removeElement('el-1');

      const state = useDiagramStore.getState();
      expect(state.allElements).toHaveLength(1);
      expect(state.allElements[0].id).toBe('el-2');
    });

    it('does nothing when id is not found', () => {
      useDiagramStore.getState().addElement(makeElement({ id: 'el-1' }));
      useDiagramStore.getState().removeElement('nonexistent');

      expect(useDiagramStore.getState().allElements).toHaveLength(1);
    });
  });

  describe('drillDown', () => {
    it('advances from L1 to L2 and pushes to navigation stack', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'My System' });
      const container = makeElement({ id: 'cont-1', type: 'container', parentId: 'sys-1' });
      useDiagramStore.getState().setElements([system, container], []);

      useDiagramStore.getState().drillDown('sys-1');

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L2');
      expect(state.navigationStack).toHaveLength(1);
      expect(state.navigationStack[0]).toEqual({
        level: 'L1',
        parentId: 'sys-1',
        label: 'My System',
      });
    });

    it('advances from L2 to L3', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      const container = makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' });
      const component = makeElement({ id: 'comp-1', type: 'component', parentId: 'cont-1' });
      useDiagramStore.getState().setElements([system, container, component], []);

      // First drill to L2
      useDiagramStore.getState().drillDown('sys-1');
      // Then drill to L3
      useDiagramStore.getState().drillDown('cont-1');

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L3');
      expect(state.navigationStack).toHaveLength(2);
      expect(state.navigationStack[1]).toEqual({
        level: 'L2',
        parentId: 'cont-1',
        label: 'Container',
      });
    });

    it('advances from L3 to L4', () => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
        makeElement({ id: 'comp-1', type: 'component', name: 'Component', parentId: 'cont-1' }),
        makeElement({ id: 'code-1', type: 'code', parentId: 'comp-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      useDiagramStore.getState().drillDown('sys-1');
      useDiagramStore.getState().drillDown('cont-1');
      useDiagramStore.getState().drillDown('comp-1');

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L4');
      expect(state.navigationStack).toHaveLength(3);
    });

    it('does nothing when already at L4', () => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
        makeElement({ id: 'comp-1', type: 'component', name: 'Component', parentId: 'cont-1' }),
        makeElement({ id: 'code-1', type: 'code', name: 'Code', parentId: 'comp-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      useDiagramStore.getState().drillDown('sys-1');
      useDiagramStore.getState().drillDown('cont-1');
      useDiagramStore.getState().drillDown('comp-1');
      // Try to drill past L4
      useDiagramStore.getState().drillDown('code-1');

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L4');
      expect(state.navigationStack).toHaveLength(3);
    });

    it('does nothing when nodeId is not found', () => {
      useDiagramStore.getState().setElements([makeElement({ id: 'sys-1' })], []);
      useDiagramStore.getState().drillDown('nonexistent');

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L1');
      expect(state.navigationStack).toHaveLength(0);
    });
  });

  describe('navigateToBreadcrumb', () => {
    beforeEach(() => {
      // Set up a 3-level deep navigation: L1 → L2 → L3
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
        makeElement({ id: 'comp-1', type: 'component', name: 'Component', parentId: 'cont-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);
      useDiagramStore.getState().drillDown('sys-1'); // L1 → L2
      useDiagramStore.getState().drillDown('cont-1'); // L2 → L3
    });

    it('navigates back to the first breadcrumb (L1)', () => {
      // Stack: [{level: L1, ...}, {level: L2, ...}]
      // Navigate to index 0 → restore L1, stack becomes []
      useDiagramStore.getState().navigateToBreadcrumb(0);

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L1');
      expect(state.navigationStack).toHaveLength(0);
    });

    it('navigates back to the second breadcrumb (L2)', () => {
      // Stack: [{level: L1, ...}, {level: L2, ...}]
      // Navigate to index 1 → restore L2, stack becomes [{level: L1, ...}]
      useDiagramStore.getState().navigateToBreadcrumb(1);

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L2');
      expect(state.navigationStack).toHaveLength(1);
      expect(state.navigationStack[0].level).toBe('L1');
    });

    it('navigates to root when index is negative', () => {
      useDiagramStore.getState().navigateToBreadcrumb(-1);

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L1');
      expect(state.navigationStack).toHaveLength(0);
    });

    it('navigates to root when index is out of range', () => {
      useDiagramStore.getState().navigateToBreadcrumb(99);

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L1');
      expect(state.navigationStack).toHaveLength(0);
    });
  });

  describe('CRUD sequence', () => {
    it('handles add → update → remove correctly', () => {
      const store = useDiagramStore.getState();

      // Add
      store.addElement(makeElement({ id: 'el-1', name: 'Original' }));
      expect(useDiagramStore.getState().allElements).toHaveLength(1);
      expect(useDiagramStore.getState().allElements[0].name).toBe('Original');

      // Update
      useDiagramStore.getState().updateElement('el-1', { name: 'Modified', description: 'New desc' });
      expect(useDiagramStore.getState().allElements[0].name).toBe('Modified');
      expect(useDiagramStore.getState().allElements[0].description).toBe('New desc');

      // Remove
      useDiagramStore.getState().removeElement('el-1');
      expect(useDiagramStore.getState().allElements).toHaveLength(0);
    });
  });

  describe('selector hooks are exported', () => {
    it('exports all required selector hooks', async () => {
      const mod = await import('./diagram-store');
      expect(typeof mod.useNodes).toBe('function');
      expect(typeof mod.useEdges).toBe('function');
      expect(typeof mod.useActiveLevel).toBe('function');
      expect(typeof mod.useNavigationStack).toBe('function');
      expect(typeof mod.useViewport).toBe('function');
      expect(typeof mod.useAllElements).toBe('function');
      expect(typeof mod.useParseErrors).toBe('function');
      expect(typeof mod.useSubCanvasStack).toBe('function');
      expect(typeof mod.useSheetViewports).toBe('function');
    });
  });

  describe('navigateToSubCanvas', () => {
    it('pushes a new entry onto subCanvasStack with correct parentId and label', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'My System' });
      useDiagramStore.getState().setElements([system], []);

      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(1);
      expect(state.subCanvasStack[0]).toEqual({
        parentId: 'sys-1',
        label: 'My System',
      });
    });

    it('does nothing when nodeId is not found', () => {
      useDiagramStore.getState().setElements([makeElement({ id: 'sys-1' })], []);

      useDiagramStore.getState().navigateToSubCanvas('nonexistent');

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(0);
    });

    it('saves the current viewport under "root" key when stack is empty', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      useDiagramStore.getState().setElements([system], []);
      useDiagramStore.getState().setViewport({ x: 100, y: 200, zoom: 1.5 });

      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      expect(state.sheetViewports['root']).toEqual({ x: 100, y: 200, zoom: 1.5 });
    });

    it('saves the current viewport under the current top entry parentId when stack is non-empty', () => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      // Navigate to sys-1 sub-canvas first
      useDiagramStore.getState().navigateToSubCanvas('sys-1');
      // Set a new viewport while viewing sys-1's sub-canvas
      useDiagramStore.getState().setViewport({ x: 50, y: 75, zoom: 2 });

      // Navigate deeper to cont-1
      useDiagramStore.getState().navigateToSubCanvas('cont-1');

      const state = useDiagramStore.getState();
      // The viewport for sys-1 should be saved
      expect(state.sheetViewports['sys-1']).toEqual({ x: 50, y: 75, zoom: 2 });
      expect(state.subCanvasStack).toHaveLength(2);
    });

    it('restores the target sheet viewport if it exists in sheetViewports', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      useDiagramStore.getState().setElements([system], []);

      // Pre-populate a saved viewport for sys-1
      useDiagramStore.setState({
        sheetViewports: { 'sys-1': { x: 300, y: 400, zoom: 0.8 } },
      });

      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      expect(state.viewport).toEqual({ x: 300, y: 400, zoom: 0.8 });
    });

    it('uses default viewport when target sheet has no saved viewport', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      useDiagramStore.getState().setElements([system], []);
      useDiagramStore.getState().setViewport({ x: 100, y: 200, zoom: 1.5 });

      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it('does not change activeLevel', () => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      // Drill down to L2 first
      useDiagramStore.getState().drillDown('sys-1');
      expect(useDiagramStore.getState().activeLevel).toBe('L2');

      // Navigate to sub-canvas — activeLevel should remain L2
      useDiagramStore.getState().navigateToSubCanvas('cont-1');

      const state = useDiagramStore.getState();
      expect(state.activeLevel).toBe('L2');
      expect(state.subCanvasStack).toHaveLength(1);
    });

    it('supports nested sub-canvas navigation', () => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
        makeElement({ id: 'comp-1', type: 'component', name: 'Component', parentId: 'cont-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      useDiagramStore.getState().navigateToSubCanvas('sys-1');
      useDiagramStore.getState().navigateToSubCanvas('cont-1');
      useDiagramStore.getState().navigateToSubCanvas('comp-1');

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(3);
      expect(state.subCanvasStack[0]).toEqual({ parentId: 'sys-1', label: 'System' });
      expect(state.subCanvasStack[1]).toEqual({ parentId: 'cont-1', label: 'Container' });
      expect(state.subCanvasStack[2]).toEqual({ parentId: 'comp-1', label: 'Component' });
    });

    it('navigating to the same node again pushes a duplicate entry', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      useDiagramStore.getState().setElements([system], []);

      useDiagramStore.getState().navigateToSubCanvas('sys-1');
      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(2);
      expect(state.subCanvasStack[0].parentId).toBe('sys-1');
      expect(state.subCanvasStack[1].parentId).toBe('sys-1');
    });

    it('saves current nodes and edges under the active sheet key when navigating away', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      useDiagramStore.getState().setElements([system], []);

      // Set up some nodes and edges on the root sheet
      const rootNodes = [
        { id: 'n1', type: 'system', position: { x: 10, y: 20 }, data: {} },
        { id: 'n2', type: 'system', position: { x: 30, y: 40 }, data: {} },
      ];
      const rootEdges = [
        { id: 'e1', source: 'n1', target: 'n2', type: 'smoothstep' },
      ];
      useDiagramStore.getState().setNodes(rootNodes);
      useDiagramStore.getState().setEdges(rootEdges);

      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      // Root nodes/edges should be saved in sheetNodeData
      expect(state.sheetNodeData['root']).toBeDefined();
      expect(state.sheetNodeData['root'].nodes).toEqual(rootNodes);
      expect(state.sheetNodeData['root'].edges).toEqual(rootEdges);
    });

    it('restores saved nodes and edges when navigating to a previously visited sheet', () => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      // Set up root nodes
      const rootNodes = [
        { id: 'n1', type: 'system', position: { x: 10, y: 20 }, data: {} },
      ];
      const rootEdges = [
        { id: 'e1', source: 'n1', target: 'n2', type: 'smoothstep' },
      ];
      useDiagramStore.getState().setNodes(rootNodes);
      useDiagramStore.getState().setEdges(rootEdges);

      // Navigate to sub-canvas (saves root nodes/edges, clears to empty for new sheet)
      useDiagramStore.getState().navigateToSubCanvas('sys-1');
      expect(useDiagramStore.getState().nodes).toEqual([]);
      expect(useDiagramStore.getState().edges).toEqual([]);

      // Set up sub-canvas nodes
      const subNodes = [
        { id: 'sub1', type: 'container', position: { x: 100, y: 200 }, data: {} },
      ];
      useDiagramStore.getState().setNodes(subNodes);

      // Navigate back to root
      useDiagramStore.getState().navigateToSheet(-1);

      const state = useDiagramStore.getState();
      // Root nodes/edges should be restored
      expect(state.nodes).toEqual(rootNodes);
      expect(state.edges).toEqual(rootEdges);
    });

    it('sets nodes and edges to empty arrays for first visit to a sheet', () => {
      const system = makeElement({ id: 'sys-1', type: 'system', name: 'System' });
      useDiagramStore.getState().setElements([system], []);

      // Set up root nodes
      useDiagramStore.getState().setNodes([
        { id: 'n1', type: 'system', position: { x: 10, y: 20 }, data: {} },
      ]);

      // Navigate to sys-1 sub-canvas (first visit — no saved data)
      useDiagramStore.getState().navigateToSubCanvas('sys-1');

      const state = useDiagramStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
    });
  });

  describe('navigateToSheet', () => {
    beforeEach(() => {
      // Set up a 3-deep sub-canvas stack: root → sys-1 → cont-1 → comp-1
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
        makeElement({ id: 'comp-1', type: 'component', name: 'Component', parentId: 'cont-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      // Navigate into each sub-canvas, setting distinct viewports along the way
      useDiagramStore.getState().setViewport({ x: 10, y: 20, zoom: 1 });
      useDiagramStore.getState().navigateToSubCanvas('sys-1');
      useDiagramStore.getState().setViewport({ x: 30, y: 40, zoom: 1.5 });
      useDiagramStore.getState().navigateToSubCanvas('cont-1');
      useDiagramStore.getState().setViewport({ x: 50, y: 60, zoom: 2 });
      useDiagramStore.getState().navigateToSubCanvas('comp-1');
    });

    it('navigates to root when index is -1 (clears the stack)', () => {
      useDiagramStore.getState().navigateToSheet(-1);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(0);
    });

    it('restores root viewport when navigating to root', () => {
      useDiagramStore.getState().navigateToSheet(-1);

      const state = useDiagramStore.getState();
      // Root viewport was saved as { x: 10, y: 20, zoom: 1 }
      expect(state.sheetViewports['root']).toEqual({ x: 10, y: 20, zoom: 1 });
      expect(state.viewport).toEqual({ x: 10, y: 20, zoom: 1 });
    });

    it('truncates stack to index 0 (keeps only first entry)', () => {
      useDiagramStore.getState().navigateToSheet(0);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(1);
      expect(state.subCanvasStack[0]).toEqual({ parentId: 'sys-1', label: 'System' });
    });

    it('restores viewport for the target sheet at index 0', () => {
      useDiagramStore.getState().navigateToSheet(0);

      const state = useDiagramStore.getState();
      // sys-1 viewport was saved as { x: 30, y: 40, zoom: 1.5 }
      expect(state.viewport).toEqual({ x: 30, y: 40, zoom: 1.5 });
    });

    it('truncates stack to index 1 (keeps first two entries)', () => {
      useDiagramStore.getState().navigateToSheet(1);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(2);
      expect(state.subCanvasStack[0]).toEqual({ parentId: 'sys-1', label: 'System' });
      expect(state.subCanvasStack[1]).toEqual({ parentId: 'cont-1', label: 'Container' });
    });

    it('restores viewport for the target sheet at index 1', () => {
      useDiagramStore.getState().navigateToSheet(1);

      const state = useDiagramStore.getState();
      // cont-1 viewport was saved as { x: 50, y: 60, zoom: 2 }
      expect(state.viewport).toEqual({ x: 50, y: 60, zoom: 2 });
    });

    it('navigating to the last index is a no-op on stack length', () => {
      // Stack has 3 entries (indices 0, 1, 2). Navigating to index 2 keeps all 3.
      useDiagramStore.getState().navigateToSheet(2);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(3);
    });

    it('saves current viewport before truncating', () => {
      // Set a custom viewport while viewing comp-1's sub-canvas
      useDiagramStore.getState().setViewport({ x: 999, y: 888, zoom: 3 });

      useDiagramStore.getState().navigateToSheet(0);

      const state = useDiagramStore.getState();
      // The viewport for comp-1 (the active sheet before navigation) should be saved
      expect(state.sheetViewports['comp-1']).toEqual({ x: 999, y: 888, zoom: 3 });
    });

    it('navigates to root when index is out of range (>= stack length)', () => {
      useDiagramStore.getState().navigateToSheet(99);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(0);
    });

    it('navigates to root when index is less than -1', () => {
      useDiagramStore.getState().navigateToSheet(-5);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(0);
    });

    it('does not change activeLevel', () => {
      // Drill down to L2 first
      useDiagramStore.getState().drillDown('sys-1');
      expect(useDiagramStore.getState().activeLevel).toBe('L2');

      useDiagramStore.getState().navigateToSheet(0);

      expect(useDiagramStore.getState().activeLevel).toBe('L2');
    });

    it('uses default viewport when target sheet has no saved viewport', () => {
      // Clear all saved viewports
      useDiagramStore.setState({ sheetViewports: {} });

      useDiagramStore.getState().navigateToSheet(-1);

      const state = useDiagramStore.getState();
      expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it('preserves entries at indices 0..index unchanged', () => {
      const originalStack = [...useDiagramStore.getState().subCanvasStack];

      useDiagramStore.getState().navigateToSheet(1);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack[0]).toEqual(originalStack[0]);
      expect(state.subCanvasStack[1]).toEqual(originalStack[1]);
    });

    it('works correctly when stack is empty and navigating to root', () => {
      // Reset to empty stack
      useDiagramStore.setState({ subCanvasStack: [] });
      useDiagramStore.getState().setViewport({ x: 42, y: 84, zoom: 1.2 });

      useDiagramStore.getState().navigateToSheet(-1);

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(0);
      // Viewport should be saved and restored for root
      expect(state.sheetViewports['root']).toEqual({ x: 42, y: 84, zoom: 1.2 });
    });

    it('saves current nodes/edges and restores target sheet nodes/edges', () => {
      // At this point we're 3 levels deep (from beforeEach): root → sys-1 → cont-1 → comp-1
      // Set some nodes on the current (comp-1) sheet
      const compNodes = [
        { id: 'comp-node', type: 'component', position: { x: 500, y: 600 }, data: {} },
      ];
      const compEdges = [
        { id: 'comp-edge', source: 'comp-node', target: 'comp-node', type: 'smoothstep' },
      ];
      useDiagramStore.getState().setNodes(compNodes);
      useDiagramStore.getState().setEdges(compEdges);

      // Pre-populate saved node data for root
      useDiagramStore.setState({
        sheetNodeData: {
          ...useDiagramStore.getState().sheetNodeData,
          root: {
            nodes: [{ id: 'root-node', type: 'system', position: { x: 1, y: 2 }, data: {} }],
            edges: [{ id: 'root-edge', source: 'a', target: 'b', type: 'smoothstep' }],
          },
        },
      });

      // Navigate to root
      useDiagramStore.getState().navigateToSheet(-1);

      const state = useDiagramStore.getState();
      // comp-1's nodes/edges should be saved
      expect(state.sheetNodeData['comp-1'].nodes).toEqual(compNodes);
      expect(state.sheetNodeData['comp-1'].edges).toEqual(compEdges);
      // Root's nodes/edges should be restored
      expect(state.nodes).toEqual([{ id: 'root-node', type: 'system', position: { x: 1, y: 2 }, data: {} }]);
      expect(state.edges).toEqual([{ id: 'root-edge', source: 'a', target: 'b', type: 'smoothstep' }]);
    });
  });

  describe('navigateToRoot', () => {
    beforeEach(() => {
      const elements = [
        makeElement({ id: 'sys-1', type: 'system', name: 'System' }),
        makeElement({ id: 'cont-1', type: 'container', name: 'Container', parentId: 'sys-1' }),
      ];
      useDiagramStore.getState().setElements(elements, []);

      useDiagramStore.getState().setViewport({ x: 10, y: 20, zoom: 1 });
      useDiagramStore.getState().navigateToSubCanvas('sys-1');
      useDiagramStore.getState().setViewport({ x: 30, y: 40, zoom: 1.5 });
      useDiagramStore.getState().navigateToSubCanvas('cont-1');
    });

    it('clears the subCanvasStack', () => {
      useDiagramStore.getState().navigateToRoot();

      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toHaveLength(0);
    });

    it('restores the root viewport', () => {
      useDiagramStore.getState().navigateToRoot();

      const state = useDiagramStore.getState();
      expect(state.viewport).toEqual({ x: 10, y: 20, zoom: 1 });
    });

    it('saves the current viewport before clearing', () => {
      useDiagramStore.getState().setViewport({ x: 777, y: 888, zoom: 2.5 });

      useDiagramStore.getState().navigateToRoot();

      const state = useDiagramStore.getState();
      expect(state.sheetViewports['cont-1']).toEqual({ x: 777, y: 888, zoom: 2.5 });
    });

    it('does not change activeLevel', () => {
      useDiagramStore.getState().drillDown('sys-1');
      expect(useDiagramStore.getState().activeLevel).toBe('L2');

      useDiagramStore.getState().navigateToRoot();

      expect(useDiagramStore.getState().activeLevel).toBe('L2');
    });

    it('is a no-op on stack when already at root', () => {
      useDiagramStore.setState({ subCanvasStack: [] });

      useDiagramStore.getState().navigateToRoot();

      expect(useDiagramStore.getState().subCanvasStack).toHaveLength(0);
    });
  });

  describe('sub-canvas initial state', () => {
    it('has subCanvasStack initialized to empty array', () => {
      const state = useDiagramStore.getState();
      expect(state.subCanvasStack).toEqual([]);
    });

    it('has sheetViewports initialized to empty object', () => {
      const state = useDiagramStore.getState();
      expect(state.sheetViewports).toEqual({});
    });

    it('has sheetNodeData initialized to empty object', () => {
      const state = useDiagramStore.getState();
      expect(state.sheetNodeData).toEqual({});
    });
  });
});
