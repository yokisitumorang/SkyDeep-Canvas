import matter from 'gray-matter';
import type { C4Type, C4Level, ArchitectureElement, Relationship } from '@/types/c4';
import type { ParseOutcome, ValidationResult } from '@/types/parser';

/** Valid C4 element types */
const VALID_C4_TYPES: C4Type[] = ['system', 'container', 'component', 'code'];

/** Maps a C4 type to its corresponding hierarchy level */
const TYPE_TO_LEVEL: Record<C4Type, C4Level> = {
  system: 'L1',
  container: 'L2',
  component: 'L3',
  code: 'L4',
  group: 'L1',
  simple: 'L1',
  text: 'L1',
};

/** Required fields in architecture file frontmatter */
const REQUIRED_FIELDS = ['id', 'type', 'name', 'description'] as const;

/**
 * Validates frontmatter data against the required schema.
 * Checks for presence of required fields and valid C4 type value.
 */
export function validateFrontmatter(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Only validate type value if the type field is present
  if (data.type !== undefined && data.type !== null && data.type !== '') {
    if (!VALID_C4_TYPES.includes(data.type as C4Type)) {
      errors.push(
        `Invalid type "${data.type}". Accepted values: ${VALID_C4_TYPES.join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parses a raw architecture file string into structured data.
 * Extracts YAML frontmatter and Markdown body using gray-matter,
 * validates required fields, and maps to an ArchitectureElement.
 */
export function parseFile(content: string, filePath: string): ParseOutcome {
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filePath,
      error: `Malformed YAML frontmatter: ${message}`,
    };
  }

  const frontmatter = parsed.data as Record<string, unknown>;
  const validation = validateFrontmatter(frontmatter);

  if (!validation.valid) {
    return {
      success: false,
      filePath,
      error: validation.errors.join('; '),
    };
  }

  const c4Type = frontmatter.type as C4Type;

  // Extract relationships array, defaulting to empty
  const rawRelationships = Array.isArray(frontmatter.relationships)
    ? frontmatter.relationships
    : [];

  const relationships: Relationship[] = rawRelationships
    .filter(
      (rel: unknown): rel is Record<string, unknown> =>
        typeof rel === 'object' && rel !== null && 'targetId' in rel
    )
    .map((rel: Record<string, unknown>) => ({
      targetId: String(rel.targetId),
      ...(rel.label !== undefined ? { label: String(rel.label) } : {}),
      ...(rel.technology !== undefined ? { technology: String(rel.technology) } : {}),
    }));

  const element: ArchitectureElement = {
    id: String(frontmatter.id),
    type: c4Type,
    name: String(frontmatter.name),
    description: String(frontmatter.description),
    ...(frontmatter.technology !== undefined
      ? { technology: String(frontmatter.technology) }
      : {}),
    ...(frontmatter.parentId !== undefined
      ? { parentId: String(frontmatter.parentId) }
      : {}),
    ...(frontmatter.boundary !== undefined
      ? { boundary: String(frontmatter.boundary) }
      : {}),
    relationships,
  };

  return {
    success: true,
    element,
    body: parsed.content,
  };
}

/** Maps a C4 type to its hierarchy level */
export function mapTypeToLevel(type: C4Type): C4Level {
  return TYPE_TO_LEVEL[type];
}
