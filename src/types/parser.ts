import type { ArchitectureElement } from './c4';

/** Successful parse result containing the extracted element and body */
export interface ParseResult {
  success: true;
  element: ArchitectureElement;
  body: string;
}

/** Failed parse result with file path and error description */
export interface ParseError {
  success: false;
  filePath: string;
  error: string;
}

/** Discriminated union of parse outcomes */
export type ParseOutcome = ParseResult | ParseError;

/** Result of frontmatter field validation */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
