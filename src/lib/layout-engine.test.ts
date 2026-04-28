import { describe, it, expect, vi } from 'vitest';
import { computeLayout, gridFallbackLayout } from './layout-engine';
import type { LayoutInput } from '@/types/layout';

describe('gridFallbackLayout', () => {
  it('returns empty results for empty input', () => {
    const input: LayoutInput = { nodes: [], edges: [], boundaryGroups: [] };
    const result = gridFallbackLayout(input);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('arranges a single node at origin', () => {
    const input: LayoutInput = {
      nodes: [{ id: 'a', width: 100, height: 80 }],
      edges: [],
      boundaryGroups: [],
    };
    const result = gridFallbackLayout(input);
    expect(result.nodes).toEqual([{ id: 'a', x: 0, y: 0 }]);
  });

  it('arranges multiple nodes in a grid pattern', () => {
    const input: LayoutInput = {
      nodes: [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 100, height: 80 },
        { id: 'c', width: 100, height: 80 },
        { id: 'd', width: 100, height: 80 },
      ],
      edges: [],
      boundaryGroups: [],
    };
    const result = gridFallbackLayout(input);

    // 4 nodes → ceil(sqrt(4)) = 2 columns
    expect(result.nodes).toHaveLength(4);
    expect(result.nodes[0]).toEqual({ id: 'a', x: 0, y: 0 });
    expect(result.nodes[1]).toEqual({ id: 'b', x: 250, y: 0 });
    expect(result.nodes[2]).toEqual({ id: 'c', x: 0, y: 200 });
    expect(result.nodes[3]).toEqual({ id: 'd', x: 250, y: 200 });
  });

  it('returns edges with empty sections', () => {
    const input: LayoutInput = {
      nodes: [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 100, height: 80 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
      boundaryGroups: [],
    };
    const result = gridFallbackLayout(input);
    expect(result.edges).toEqual([{ id: 'e1', sections: [] }]);
  });

  it('produces no overlapping positions', () => {
    const input: LayoutInput = {
      nodes: Array.from({ length: 9 }, (_, i) => ({
        id: `n${i}`,
        width: 100,
        height: 80,
      })),
      edges: [],
      boundaryGroups: [],
    };
    const result = gridFallbackLayout(input);

    // Check all positions are unique
    const positions = result.nodes.map((n) => `${n.x},${n.y}`);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(positions.length);
  });
});

describe('computeLayout', () => {
  it('returns empty results for empty input', async () => {
    const input: LayoutInput = { nodes: [], edges: [], boundaryGroups: [] };
    const result = await computeLayout(input);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('computes positions for simple nodes', async () => {
    const input: LayoutInput = {
      nodes: [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 100, height: 80 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
      boundaryGroups: [],
    };
    const result = await computeLayout(input);

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find((n) => n.id === 'a')).toBeDefined();
    expect(result.nodes.find((n) => n.id === 'b')).toBeDefined();

    // Positions should be numbers
    for (const node of result.nodes) {
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
    }
  });

  it('produces non-overlapping positions for multiple nodes', async () => {
    const input: LayoutInput = {
      nodes: [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 100, height: 80 },
        { id: 'c', width: 100, height: 80 },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ],
      boundaryGroups: [],
    };
    const result = await computeLayout(input);

    expect(result.nodes).toHaveLength(3);

    // Check no two nodes overlap
    for (let i = 0; i < result.nodes.length; i++) {
      for (let j = i + 1; j < result.nodes.length; j++) {
        const ni = result.nodes[i];
        const nj = result.nodes[j];
        const nodeI = input.nodes.find((n) => n.id === ni.id)!;
        const nodeJ = input.nodes.find((n) => n.id === nj.id)!;

        const overlapX =
          ni.x < nj.x + nodeJ.width && nj.x < ni.x + nodeI.width;
        const overlapY =
          ni.y < nj.y + nodeJ.height && nj.y < ni.y + nodeI.height;

        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it('handles boundary groups by nesting children', async () => {
    const input: LayoutInput = {
      nodes: [
        { id: 'child1', width: 80, height: 60 },
        { id: 'child2', width: 80, height: 60 },
        { id: 'outside', width: 100, height: 80 },
      ],
      edges: [],
      boundaryGroups: [
        {
          id: 'group1',
          label: 'Internal',
          childIds: ['child1', 'child2'],
        },
      ],
    };
    const result = await computeLayout(input);

    // All nodes should have positions
    const child1 = result.nodes.find((n) => n.id === 'child1');
    const child2 = result.nodes.find((n) => n.id === 'child2');
    const outside = result.nodes.find((n) => n.id === 'outside');

    expect(child1).toBeDefined();
    expect(child2).toBeDefined();
    expect(outside).toBeDefined();
  });

  it('returns edge sections from ELK', async () => {
    const input: LayoutInput = {
      nodes: [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 100, height: 80 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
      boundaryGroups: [],
    };
    const result = await computeLayout(input);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe('e1');
    // ELK should produce sections for the edge
    expect(result.edges[0].sections).toBeDefined();
  });

  it('falls back to grid layout when ELK fails', async () => {
    // We test the fallback by mocking ELK to throw
    const elkModule = await import('elkjs/lib/elk.bundled.js');
    const originalLayout = elkModule.default.prototype.layout;
    elkModule.default.prototype.layout = vi.fn().mockRejectedValue(new Error('ELK failure'));

    const input: LayoutInput = {
      nodes: [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 100, height: 80 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
      boundaryGroups: [],
    };

    const result = await computeLayout(input);

    // Should still return valid positions (from grid fallback)
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0]).toEqual({ id: 'a', x: 0, y: 0 });
    expect(result.nodes[1]).toEqual({ id: 'b', x: 250, y: 0 });
    expect(result.edges[0].sections).toEqual([]);

    // Restore
    elkModule.default.prototype.layout = originalLayout;
  });

  it('completes layout for 50 nodes within 2 seconds', async () => {
    const nodes = Array.from({ length: 50 }, (_, i) => ({
      id: `n${i}`,
      width: 100,
      height: 80,
    }));
    const edges = Array.from({ length: 30 }, (_, i) => ({
      id: `e${i}`,
      source: `n${i}`,
      target: `n${i + 1}`,
    }));

    const input: LayoutInput = { nodes, edges, boundaryGroups: [] };

    const start = Date.now();
    const result = await computeLayout(input);
    const elapsed = Date.now() - start;

    expect(result.nodes).toHaveLength(50);
    expect(elapsed).toBeLessThan(2000);
  });
});
