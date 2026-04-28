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
    });
  });
});
