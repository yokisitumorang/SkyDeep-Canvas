import matter from 'gray-matter';
import type { ArchitectureElement } from '@/types/c4';

/**
 * Serializes an ArchitectureElement and Markdown body content into a full
 * Markdown string with YAML frontmatter. Field ordering is consistent:
 * id, type, name, description, technology, parentId, boundary, relationships.
 * Optional fields are only included when they have values.
 */
export function serialize(element: ArchitectureElement, body: string): string {
  // Build frontmatter object with consistent field ordering.
  // We construct a fresh object in the exact key order we want,
  // only including optional fields when they have values.
  const frontmatter: Record<string, unknown> = {
    id: element.id,
    type: element.type,
    name: element.name,
    description: element.description,
  };

  if (element.technology !== undefined) {
    frontmatter.technology = element.technology;
  }

  if (element.parentId !== undefined) {
    frontmatter.parentId = element.parentId;
  }

  if (element.boundary !== undefined) {
    frontmatter.boundary = element.boundary;
  }

  if (element.relationships.length > 0) {
    frontmatter.relationships = element.relationships.map((rel) => {
      const mapped: Record<string, string> = { targetId: rel.targetId };
      if (rel.label !== undefined) {
        mapped.label = rel.label;
      }
      if (rel.technology !== undefined) {
        mapped.technology = rel.technology;
      }
      return mapped;
    });
  }

  return matter.stringify(body, frontmatter);
}

/**
 * Generates a unique ID for new architecture elements using crypto.randomUUID().
 */
export function generateId(): string {
  return crypto.randomUUID();
}
