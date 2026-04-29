---
inclusion: always
---

# Mandatory Feature: Persistence for All Canvas State

## Rule
Every feature that adds, modifies, or removes canvas state (nodes, edges, positions, styles, labels, or any visual property) MUST persist to both IndexedDB (auto-save) and file (manual save). No exceptions.

## Persistence Architecture

This project uses a two-tier persistence system:

1. **IndexedDB (auto-save)**: The full `WorkspaceFile` is saved to IndexedDB on every store change (debounced 2s). This preserves unsaved work across page reloads.
2. **File System (manual save)**: The same `WorkspaceFile` is written to a `.c4.json` file when the user clicks Save/Save As.

### Source of Truth

- **`store.allElements`** (ArchitectureElement[]) is the primary persistence layer for nodes. Every node type (system, container, component, code, text, group, simple) MUST have a corresponding element added via `store.addElement()`.
- **`store.edges`** are saved directly in the `WorkspaceFile.edges` array for full-fidelity restore (handles, multiple edges per pair).
- **`store.nodes`** is the visual/ephemeral layer — derived from elements on restore. Never rely on nodes alone for persistence.

### What Gets Saved in WorkspaceFile

| Field | What it stores |
|---|---|
| `elements` | All ArchitectureElements (the node data model) |
| `positions` | Node x/y positions and optional width/height |
| `edges` | Full edge data: id, source, target, handles, type, label |
| `edgeStyles` | Legacy edge styles (backward compat) |
| `nodeColors` | Custom node colors |
| `textFonts` | Text node font choices |
| `nodeParents` | Group parent relationships |
| `viewport` | Camera position and zoom |
| `activeLevel` / `navigationStack` | Navigation state |

## Checklist for New Features

When implementing any new feature, verify:

- [ ] New node types call `store.addElement()` with a proper `ArchitectureElement`
- [ ] New node types are included in the `renderElements` filter (like text/group/simple)
- [ ] New node types have their data mapped correctly in `elementsToNodes` (transform.ts)
- [ ] `renderElements` wires up any callbacks (onLabelChange, onEdit, etc.) for restored nodes
- [ ] New edges use unique IDs that include handle info for multi-edge support
- [ ] Edge changes are captured in both `buildWorkspaceFile` and the auto-save effect
- [ ] Any new visual properties (colors, fonts, sizes) are captured and restored
- [ ] The `C4Type` union in `types/c4.ts` includes the new type
- [ ] The `TYPE_TO_LEVEL` map in `parser.ts` includes the new type
- [ ] Changes work after page reload (test the full save → restore cycle)
