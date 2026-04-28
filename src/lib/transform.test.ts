import { describe, it, expect } from 'vitest';
import { elementsToNodes, elementsToEdges } from './transform';
import type { ArchitectureElement } from '@/types/c4';

function makeElement(overrides: Partial<ArchitectureElement> = {}): ArchitectureElement {
  return {
    id: 'el-1',
    type: 'system',
    name: 'Test System',
    description: 'A test system',
    relationships: [],
    ...overrides,
  };
}

describe('elementsToNodes', () => {
  it('maps a single element to a ReactFlowNode with correct fields', () => {
    const element = makeElement({
      id: 'sys-1',
      type: 'system',
      name: 'My System',
      description: 'Main system',
      technology: 'Java',
    });

    const nodes = elementsToNodes([element], [element]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('sys-1');
    expect(nodes[0].type).toBe('system');
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[0].data).toMatchObject({
      name: 'My System',
      description: 'Main system',
      technology: 'Java',
      c4Type: 'system',
      hasChildren: false,
    });
    expect(typeof nodes[0].data.onDrillDown).toBe('function');
  });

  it('sets hasChildren to true when a child element exists in allElements', () => {
    const parent = makeElement({ id: 'parent-1', type: 'system' });
    const child = makeElement({ id: 'child-1', type: 'container', parentId: 'parent-1' });

    const nodes = elementsToNodes([parent], [parent, child]);

    expect(nodes[0].data.hasChildren).toBe(true);
  });

  it('sets hasChildren to false when no child element exists', () => {
    const element = makeElement({ id: 'solo-1', type: 'system' });

    const nodes = elementsToNodes([element], [element]);

    expect(nodes[0].data.hasChildren).toBe(false);
  });

  it('maps multiple elements preserving order', () => {
    const elements = [
      makeElement({ id: 'a', name: 'Alpha' }),
      makeElement({ id: 'b', name: 'Beta' }),
      makeElement({ id: 'c', name: 'Gamma' }),
    ];

    const nodes = elementsToNodes(elements, elements);

    expect(nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(nodes.map((n) => n.data.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('returns an empty array for empty input', () => {
    const nodes = elementsToNodes([], []);
    expect(nodes).toEqual([]);
  });

  it('sets the node type to match the element C4 type', () => {
    const types = ['system', 'container', 'component', 'code'] as const;

    for (const type of types) {
      const el = makeElement({ id: `el-${type}`, type });
      const nodes = elementsToNodes([el], [el]);
      expect(nodes[0].type).toBe(type);
      expect(nodes[0].data.c4Type).toBe(type);
    }
  });

  it('handles elements without technology field', () => {
    const element = makeElement({ id: 'no-tech', technology: undefined });

    const nodes = elementsToNodes([element], [element]);

    expect(nodes[0].data.technology).toBeUndefined();
  });

  it('computes hasChildren using allElements, not just visible elements', () => {
    const parent = makeElement({ id: 'parent-1', type: 'system' });
    const child = makeElement({ id: 'child-1', type: 'container', parentId: 'parent-1' });

    // child is in allElements but not in the visible elements list
    const nodes = elementsToNodes([parent], [parent, child]);

    expect(nodes[0].data.hasChildren).toBe(true);
  });

  it('provides a no-op onDrillDown placeholder', () => {
    const element = makeElement();
    const nodes = elementsToNodes([element], [element]);

    // Should not throw when called
    expect(() => (nodes[0].data.onDrillDown as (id: string) => void)('test')).not.toThrow();
  });
});

describe('elementsToEdges', () => {
  it('creates an edge from a relationship', () => {
    const source = makeElement({
      id: 'src-1',
      relationships: [{ targetId: 'tgt-1', label: 'Uses', technology: 'REST' }],
    });
    const target = makeElement({ id: 'tgt-1' });

    const edges = elementsToEdges([source], [source, target]);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 'src-1-tgt-1',
      source: 'src-1',
      target: 'tgt-1',
      type: 'smoothstep',
      label: 'Uses',
      data: {
        technology: 'REST',
        hasWarning: false,
      },
    });
  });

  it('sets hasWarning to true for dangling references', () => {
    const source = makeElement({
      id: 'src-1',
      relationships: [{ targetId: 'nonexistent' }],
    });

    const edges = elementsToEdges([source], [source]);

    expect(edges).toHaveLength(1);
    expect(edges[0].data?.hasWarning).toBe(true);
  });

  it('sets hasWarning to false when target exists in allElements', () => {
    const source = makeElement({
      id: 'src-1',
      relationships: [{ targetId: 'tgt-1' }],
    });
    const target = makeElement({ id: 'tgt-1' });

    const edges = elementsToEdges([source], [source, target]);

    expect(edges[0].data?.hasWarning).toBe(false);
  });

  it('handles elements with no relationships', () => {
    const element = makeElement({ id: 'lonely', relationships: [] });

    const edges = elementsToEdges([element], [element]);

    expect(edges).toEqual([]);
  });

  it('creates multiple edges from multiple relationships', () => {
    const source = makeElement({
      id: 'src-1',
      relationships: [
        { targetId: 'tgt-1', label: 'Reads' },
        { targetId: 'tgt-2', label: 'Writes' },
      ],
    });
    const tgt1 = makeElement({ id: 'tgt-1' });
    const tgt2 = makeElement({ id: 'tgt-2' });

    const edges = elementsToEdges([source], [source, tgt1, tgt2]);

    expect(edges).toHaveLength(2);
    expect(edges[0].id).toBe('src-1-tgt-1');
    expect(edges[1].id).toBe('src-1-tgt-2');
  });

  it('creates edges from multiple source elements', () => {
    const src1 = makeElement({
      id: 'src-1',
      relationships: [{ targetId: 'tgt-1' }],
    });
    const src2 = makeElement({
      id: 'src-2',
      relationships: [{ targetId: 'tgt-1' }],
    });
    const tgt = makeElement({ id: 'tgt-1' });

    const edges = elementsToEdges([src1, src2], [src1, src2, tgt]);

    expect(edges).toHaveLength(2);
    expect(edges[0].id).toBe('src-1-tgt-1');
    expect(edges[1].id).toBe('src-2-tgt-1');
  });

  it('handles missing label and technology gracefully', () => {
    const source = makeElement({
      id: 'src-1',
      relationships: [{ targetId: 'tgt-1' }],
    });
    const target = makeElement({ id: 'tgt-1' });

    const edges = elementsToEdges([source], [source, target]);

    expect(edges[0].label).toBeUndefined();
    expect(edges[0].data?.technology).toBeUndefined();
  });

  it('returns empty array for empty input', () => {
    const edges = elementsToEdges([], []);
    expect(edges).toEqual([]);
  });

  it('checks dangling references against allElements, not just visible elements', () => {
    const source = makeElement({
      id: 'src-1',
      relationships: [{ targetId: 'hidden-tgt' }],
    });
    const hiddenTarget = makeElement({ id: 'hidden-tgt' });

    // Target is in allElements but not in visible elements
    const edges = elementsToEdges([source], [source, hiddenTarget]);

    expect(edges[0].data?.hasWarning).toBe(false);
  });
});
