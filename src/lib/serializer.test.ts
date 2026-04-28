import { describe, it, expect } from 'vitest';
import { serialize, generateId } from './serializer';
import { parseFile } from './parser';
import type { ArchitectureElement } from '@/types/c4';

describe('serialize', () => {
  it('serializes a minimal element with only required fields', () => {
    const element: ArchitectureElement = {
      id: 'my-system',
      type: 'system',
      name: 'My System',
      description: 'A test system',
      relationships: [],
    };

    const output = serialize(element, '');
    expect(output).toContain('id: my-system');
    expect(output).toContain('type: system');
    expect(output).toContain('name: My System');
    expect(output).toContain('description: A test system');
    // Should not contain optional fields
    expect(output).not.toContain('technology');
    expect(output).not.toContain('parentId');
    expect(output).not.toContain('boundary');
    expect(output).not.toContain('relationships');
  });

  it('serializes an element with all optional fields', () => {
    const element: ArchitectureElement = {
      id: 'payment-service',
      type: 'container',
      name: 'Payment Service',
      description: 'Handles payments',
      technology: 'Node.js',
      parentId: 'ecommerce-system',
      boundary: 'internal',
      relationships: [
        { targetId: 'database', label: 'Reads/writes', technology: 'PostgreSQL' },
      ],
    };

    const output = serialize(element, '');
    expect(output).toContain('technology: Node.js');
    expect(output).toContain('parentId: ecommerce-system');
    expect(output).toContain('boundary: internal');
    expect(output).toContain('targetId: database');
    expect(output).toContain('label: Reads/writes');
  });

  it('preserves Markdown body content', () => {
    const element: ArchitectureElement = {
      id: 'test',
      type: 'system',
      name: 'Test',
      description: 'A test',
      relationships: [],
    };
    const body = '\n# Test System\n\nDetailed documentation here.\n';

    const output = serialize(element, body);
    expect(output).toContain('# Test System');
    expect(output).toContain('Detailed documentation here.');
  });

  it('maintains consistent field ordering', () => {
    const element: ArchitectureElement = {
      id: 'svc',
      type: 'container',
      name: 'Service',
      description: 'A service',
      technology: 'Java',
      parentId: 'parent',
      boundary: 'internal',
      relationships: [{ targetId: 'db' }],
    };

    const output = serialize(element, '');
    const idIndex = output.indexOf('id:');
    const typeIndex = output.indexOf('type:');
    const nameIndex = output.indexOf('name:');
    const descIndex = output.indexOf('description:');
    const techIndex = output.indexOf('technology:');
    const parentIndex = output.indexOf('parentId:');
    const boundaryIndex = output.indexOf('boundary:');
    const relsIndex = output.indexOf('relationships:');

    expect(idIndex).toBeLessThan(typeIndex);
    expect(typeIndex).toBeLessThan(nameIndex);
    expect(nameIndex).toBeLessThan(descIndex);
    expect(descIndex).toBeLessThan(techIndex);
    expect(techIndex).toBeLessThan(parentIndex);
    expect(parentIndex).toBeLessThan(boundaryIndex);
    expect(boundaryIndex).toBeLessThan(relsIndex);
  });

  it('only includes relationship fields that have values', () => {
    const element: ArchitectureElement = {
      id: 'svc',
      type: 'container',
      name: 'Service',
      description: 'A service',
      relationships: [
        { targetId: 'db' },
        { targetId: 'api', label: 'Calls' },
      ],
    };

    const output = serialize(element, '');
    // First relationship should only have targetId
    expect(output).toContain('targetId: db');
    // Second relationship should have targetId and label
    expect(output).toContain('targetId: api');
    expect(output).toContain('label: Calls');
  });
});

describe('serialize → parse round-trip', () => {
  it('round-trips a minimal element', () => {
    const element: ArchitectureElement = {
      id: 'my-system',
      type: 'system',
      name: 'My System',
      description: 'A test system',
      relationships: [],
    };
    const body = '';

    const serialized = serialize(element, body);
    const parsed = parseFile(serialized, 'test.md');

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.element.id).toBe(element.id);
    expect(parsed.element.type).toBe(element.type);
    expect(parsed.element.name).toBe(element.name);
    expect(parsed.element.description).toBe(element.description);
    expect(parsed.element.relationships).toEqual(element.relationships);
    expect(parsed.element.technology).toBeUndefined();
    expect(parsed.element.parentId).toBeUndefined();
    expect(parsed.element.boundary).toBeUndefined();
  });

  it('round-trips a full element with body content', () => {
    const element: ArchitectureElement = {
      id: 'payment-service',
      type: 'container',
      name: 'Payment Service',
      description: 'Handles payment processing',
      technology: 'Node.js / Express',
      parentId: 'ecommerce-system',
      boundary: 'internal-services',
      relationships: [
        { targetId: 'database', label: 'Reads/writes', technology: 'PostgreSQL' },
        { targetId: 'stripe-api', label: 'Processes payments', technology: 'HTTPS/REST' },
      ],
    };
    const body = '\n# Payment Service\n\nDetailed documentation about the payment service.\n';

    const serialized = serialize(element, body);
    const parsed = parseFile(serialized, 'payment-service.md');

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.element).toEqual(element);
    expect(parsed.body).toBe(body);
  });

  it('round-trips an element with empty relationships', () => {
    const element: ArchitectureElement = {
      id: 'standalone',
      type: 'component',
      name: 'Standalone Component',
      description: 'No dependencies',
      relationships: [],
    };

    const serialized = serialize(element, '');
    const parsed = parseFile(serialized, 'standalone.md');

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.element.id).toBe(element.id);
    expect(parsed.element.type).toBe(element.type);
    expect(parsed.element.relationships).toEqual([]);
  });

  it('is idempotent — serializing twice produces identical output', () => {
    const element: ArchitectureElement = {
      id: 'svc',
      type: 'container',
      name: 'Service',
      description: 'A service',
      technology: 'Java',
      parentId: 'parent',
      boundary: 'internal',
      relationships: [
        { targetId: 'db', label: 'Stores data', technology: 'JDBC' },
      ],
    };
    const body = '\n# Service\n\nSome docs.\n';

    const first = serialize(element, body);
    const second = serialize(element, body);

    expect(first).toBe(second);
  });


  it('parse → serialize → parse produces equivalent data', () => {
    const content = `---
id: "payment-service"
type: "container"
name: "Payment Service"
description: "Handles payments"
technology: "Node.js"
parentId: "ecommerce-system"
boundary: "internal"
relationships:
  - targetId: "database"
    label: "Reads/writes"
    technology: "PostgreSQL"
---

# Payment Service

Documentation here.
`;
    const firstParse = parseFile(content, 'test.md');
    expect(firstParse.success).toBe(true);
    if (!firstParse.success) return;

    const serialized = serialize(firstParse.element, firstParse.body);
    const secondParse = parseFile(serialized, 'test.md');

    expect(secondParse.success).toBe(true);
    if (!secondParse.success) return;

    expect(secondParse.element).toEqual(firstParse.element);
    expect(secondParse.body).toBe(firstParse.body);
  });
});

describe('generateId', () => {
  it('returns a valid UUID string', () => {
    const id = generateId();
    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('returns a string type', () => {
    expect(typeof generateId()).toBe('string');
  });
});
