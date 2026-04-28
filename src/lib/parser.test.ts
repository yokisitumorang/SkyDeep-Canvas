import { describe, it, expect } from 'vitest';
import { parseFile, validateFrontmatter, mapTypeToLevel } from './parser';
import type { C4Type } from '@/types/c4';

describe('validateFrontmatter', () => {
  it('returns valid for complete frontmatter with all required fields', () => {
    const data = {
      id: 'my-system',
      type: 'system',
      name: 'My System',
      description: 'A test system',
    };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing id field', () => {
    const data = { type: 'system', name: 'Test', description: 'Desc' };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: id');
  });

  it('reports missing type field', () => {
    const data = { id: 'x', name: 'Test', description: 'Desc' };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: type');
  });

  it('reports missing name field', () => {
    const data = { id: 'x', type: 'system', description: 'Desc' };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: name');
  });

  it('reports missing description field', () => {
    const data = { id: 'x', type: 'system', name: 'Test' };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: description');
  });

  it('reports multiple missing fields at once', () => {
    const data = {};
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });

  it('reports empty string fields as missing', () => {
    const data = { id: '', type: '', name: '', description: '' };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });

  it('reports invalid type value', () => {
    const data = {
      id: 'x',
      type: 'microservice',
      name: 'Test',
      description: 'Desc',
    };
    const result = validateFrontmatter(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid type "microservice"');
    expect(result.errors[0]).toContain('system');
    expect(result.errors[0]).toContain('container');
    expect(result.errors[0]).toContain('component');
    expect(result.errors[0]).toContain('code');
  });

  it('accepts all four valid C4 types', () => {
    const types: C4Type[] = ['system', 'container', 'component', 'code'];
    for (const type of types) {
      const data = { id: 'x', type, name: 'Test', description: 'Desc' };
      const result = validateFrontmatter(data);
      expect(result.valid).toBe(true);
    }
  });
});

describe('parseFile', () => {
  it('parses a valid architecture file with all fields', () => {
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
    const result = parseFile(content, 'payment-service.md');
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.element.id).toBe('payment-service');
    expect(result.element.type).toBe('container');
    expect(result.element.name).toBe('Payment Service');
    expect(result.element.description).toBe('Handles payments');
    expect(result.element.technology).toBe('Node.js');
    expect(result.element.parentId).toBe('ecommerce-system');
    expect(result.element.boundary).toBe('internal');
    expect(result.element.relationships).toHaveLength(1);
    expect(result.element.relationships[0]).toEqual({
      targetId: 'database',
      label: 'Reads/writes',
      technology: 'PostgreSQL',
    });
    expect(result.body).toContain('# Payment Service');
    expect(result.body).toContain('Documentation here.');
  });

  it('parses a minimal valid file with only required fields', () => {
    const content = `---
id: "my-sys"
type: "system"
name: "My System"
description: "A system"
---
`;
    const result = parseFile(content, 'my-sys.md');
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.element.id).toBe('my-sys');
    expect(result.element.type).toBe('system');
    expect(result.element.relationships).toEqual([]);
    expect(result.element.technology).toBeUndefined();
    expect(result.element.parentId).toBeUndefined();
    expect(result.element.boundary).toBeUndefined();
  });

  it('returns ParseError for malformed YAML', () => {
    const content = `---
id: "test
type: [invalid yaml
---
`;
    const result = parseFile(content, 'bad.md');
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.filePath).toBe('bad.md');
    expect(result.error).toBeTruthy();
  });

  it('returns ParseError for missing required fields', () => {
    const content = `---
id: "test"
---
`;
    const result = parseFile(content, 'incomplete.md');
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.filePath).toBe('incomplete.md');
    expect(result.error).toContain('Missing required field: type');
    expect(result.error).toContain('Missing required field: name');
    expect(result.error).toContain('Missing required field: description');
  });

  it('returns ParseError for invalid type value', () => {
    const content = `---
id: "test"
type: "service"
name: "Test"
description: "Desc"
---
`;
    const result = parseFile(content, 'invalid-type.md');
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.filePath).toBe('invalid-type.md');
    expect(result.error).toContain('Invalid type "service"');
    expect(result.error).toContain('system, container, component, code');
  });

  it('extracts relationships with partial fields', () => {
    const content = `---
id: "svc"
type: "container"
name: "Service"
description: "A service"
relationships:
  - targetId: "db"
  - targetId: "api"
    label: "Calls"
---
`;
    const result = parseFile(content, 'svc.md');
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.element.relationships).toHaveLength(2);
    expect(result.element.relationships[0]).toEqual({ targetId: 'db' });
    expect(result.element.relationships[1]).toEqual({
      targetId: 'api',
      label: 'Calls',
    });
  });

  it('handles file with no frontmatter delimiters', () => {
    const content = 'Just some markdown without frontmatter.';
    const result = parseFile(content, 'no-frontmatter.md');
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.filePath).toBe('no-frontmatter.md');
    expect(result.error).toContain('Missing required field');
  });

  it('handles empty relationships array', () => {
    const content = `---
id: "test"
type: "system"
name: "Test"
description: "Desc"
relationships: []
---
`;
    const result = parseFile(content, 'empty-rels.md');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.element.relationships).toEqual([]);
  });
});

describe('mapTypeToLevel', () => {
  it('maps system to L1', () => {
    expect(mapTypeToLevel('system')).toBe('L1');
  });

  it('maps container to L2', () => {
    expect(mapTypeToLevel('container')).toBe('L2');
  });

  it('maps component to L3', () => {
    expect(mapTypeToLevel('component')).toBe('L3');
  });

  it('maps code to L4', () => {
    expect(mapTypeToLevel('code')).toBe('L4');
  });
});
