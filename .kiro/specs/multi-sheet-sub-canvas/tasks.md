# Implementation Plan: Multi-Sheet Sub-Canvas

## Overview

This plan implements a multi-sheet/sub-canvas system that allows any supported node to act as a container for child elements on a dedicated sheet. The implementation extends the Zustand store with a new `subCanvasStack` and `sheetViewports`, adds a "Create Sub Level" context menu action, renders sub-canvas indicators on nodes, creates a SheetTabBar component, updates element filtering to bypass C4 type constraints inside sub-canvases, extends breadcrumb navigation, and persists all new state in the existing WorkspaceFile format.

## Tasks

- [x] 1. Extend store with sub-canvas state and navigation actions
  - [x] 1.1 Add `SubCanvasEntry` interface, `subCanvasStack`, and `sheetViewports` state to `diagram-store.ts`
    - Define `SubCanvasEntry` with `parentId: string` and `label: string`
    - Add `subCanvasStack: SubCanvasEntry[]` initialized to `[]` to `DiagramState`
    - Add `sheetViewports: Record<string, { x: number; y: number; zoom: number }>` initialized to `{}` to `DiagramState`
    - Add selector hooks: `useSubCanvasStack`, `useSheetViewports`
    - _Requirements: 3.2, 6.5_

  - [x] 1.2 Implement `navigateToSubCanvas(nodeId)` action in `diagram-store.ts`
    - Look up the node in `allElements` by `nodeId`; return early if not found
    - Save the current viewport to `sheetViewports` under the active sheet key (`"root"` if stack is empty, otherwise the current top entry's `parentId`)
    - Push a new `SubCanvasEntry { parentId: nodeId, label: element.name }` onto `subCanvasStack`
    - Restore the target sheet's viewport from `sheetViewports` if it exists, otherwise use default `{ x: 0, y: 0, zoom: 1 }`
    - _Requirements: 1.2, 1.3, 3.2, 3.3, 3.5_

  - [x] 1.3 Implement `navigateToSheet(index)` and `navigateToRoot()` actions in `diagram-store.ts`
    - `navigateToSheet(index)`: save current viewport, truncate `subCanvasStack` to `index + 1` entries (or clear for index `-1`), restore target sheet viewport
    - `navigateToRoot()`: delegate to `navigateToSheet(-1)`
    - Guard against out-of-range index by navigating to root
    - _Requirements: 5.4, 7.2, 7.3_

  - [ ]* 1.4 Write property test: navigateToSubCanvas pushes correct entry (Property 1)
    - **Property 1: navigateToSubCanvas pushes correct entry**
    - Generate random node IDs, names, and initial subCanvasStack states
    - Assert stack length increases by 1 and last entry matches nodeId/label
    - **Validates: Requirements 1.2, 3.2, 3.5**

  - [ ]* 1.5 Write property test: activeLevel invariant during sub-canvas navigation (Property 2)
    - **Property 2: activeLevel invariant during sub-canvas navigation**
    - Generate random initial activeLevel and sequences of navigateToSubCanvas/navigateToSheet calls
    - Assert activeLevel remains unchanged throughout
    - **Validates: Requirements 3.3**

  - [ ]* 1.6 Write property test: navigateToSheet truncates stack correctly (Property 6)
    - **Property 6: navigateToSheet truncates stack correctly**
    - Generate random subCanvasStack of length N and target index i where -1 <= i < N
    - Assert resulting stack length is max(0, i + 1) and entries 0..i are unchanged
    - **Validates: Requirements 5.4, 7.2, 7.3**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add "Create Sub Level" to context menu and wire navigation
  - [x] 3.1 Extend `NodeContextMenu` with `onCreateSubLevel` prop and menu item
    - Add `onCreateSubLevel?: (nodeId: string) => void` to `NodeContextMenuProps`
    - Render a "Create Sub Level" menu item with a layers/stack icon
    - Show the option only for node types: `system`, `container`, `component`, `code`, `simple`
    - Hide the option for `text` and `group` node types
    - When clicked, call `onCreateSubLevel(nodeId)` and close the menu
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 3.2 Wire `onCreateSubLevel` in `page.tsx` to call `store.navigateToSubCanvas`
    - Pass `onCreateSubLevel` callback to `NodeContextMenu` that calls `useDiagramStore.getState().navigateToSubCanvas(nodeId)`
    - After navigation, trigger `renderElements` with the updated sub-canvas context
    - _Requirements: 1.2, 1.3_

- [x] 4. Add sub-canvas indicator to node components
  - [x] 4.1 Add a clickable sub-canvas indicator icon to `SystemNode`, `ContainerNode`, `ComponentNode`, `CodeNode`, and `SimpleNode`
    - Render a small layers/stack icon at the bottom-right of the node when `data.hasChildren` is `true`
    - On click, call `data.onDrillDown(id)` which will be rewired to `navigateToSubCanvas`
    - Ensure the indicator is visually distinct and does not interfere with existing node content
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.2 Write property test: hasChildren computation correctness (Property 3)
    - **Property 3: hasChildren computation correctness**
    - Generate random arrays of ArchitectureElement with varying parentId relationships
    - Assert `hasChildren` is true iff at least one element has `parentId === element.id`
    - **Validates: Requirements 2.1, 2.2**

- [x] 5. Update element filtering for sub-canvas views
  - [x] 5.1 Update `renderElements` in `page.tsx` to use `subCanvasStack` for filtering
    - When `subCanvasStack` is non-empty, set `activeParentId` to the last entry's `parentId`
    - Filter elements by `parentId === activeParentId` regardless of C4 type (bypass `activeType` filter)
    - When `subCanvasStack` is empty, preserve existing C4-level filtering behavior
    - Include text, group, and simple nodes that match the active parentId
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 5.2 Rewire `onDrillDown` callback in `nodesWithCallbacks` to call `navigateToSubCanvas` instead of C4 `drillDown`
    - Update the `onDrillDown` callback in the `nodesWithCallbacks` useMemo to call `store.navigateToSubCanvas(nodeId)`
    - After navigation, trigger `renderElements` to re-filter elements for the new sub-canvas
    - _Requirements: 2.4, 3.1_

  - [ ]* 5.3 Write property test: sub-canvas element filtering by parentId (Property 4)
    - **Property 4: Sub-canvas element filtering by parentId**
    - Generate random element arrays and random parent IDs
    - Assert filtering returns exactly elements whose parentId matches, regardless of C4 type
    - **Validates: Requirements 3.1**

- [x] 6. Update element creation to assign parentId in sub-canvas
  - [x] 6.1 Update `handleCreateElement`, `handleAddTextNode`, and `handleAddSimpleNode` in `page.tsx`
    - Derive `currentParentId` from `subCanvasStack` (last entry's `parentId`) instead of only from `navigationStack`
    - Ensure all newly created elements in a sub-canvas get `parentId` set to the active sub-canvas parent's ID
    - _Requirements: 4.1, 4.2_

  - [ ]* 6.2 Write property test: parentId assignment for elements created in sub-canvas (Property 5)
    - **Property 5: parentId assignment for elements created in sub-canvas**
    - Generate random parent IDs and element types
    - Assert created elements have `parentId === P` when sub-canvas with parent P is active
    - **Validates: Requirements 4.1, 4.2, 4.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create SheetTabBar component
  - [x] 8.1 Create `src/components/SheetTabBar.tsx`
    - Accept props: `subCanvasStack: SubCanvasEntry[]`, `activeIndex: number` (-1 for root), `onSelectSheet: (index: number) => void`
    - Always render a "Root" tab
    - Render one tab per entry in `subCanvasStack` using the entry's `label`
    - Highlight the active tab (last entry when at deepest level, or the selected index)
    - Style as a horizontal tab bar at the bottom of the canvas area using Tailwind
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

  - [x] 8.2 Wire `SheetTabBar` into `page.tsx`
    - Import and render `SheetTabBar` below the ReactFlow canvas area
    - Pass `subCanvasStack` from the store, compute `activeIndex`, and wire `onSelectSheet` to `store.navigateToSheet`
    - After sheet selection, trigger `renderElements` to re-filter and restore viewport
    - _Requirements: 5.4_

- [x] 9. Extend Breadcrumb for sub-canvas navigation
  - [x] 9.1 Update `Breadcrumb.tsx` to display sub-canvas navigation path
    - Accept `subCanvasStack: SubCanvasEntry[]` as an additional prop
    - When `subCanvasStack` is non-empty, render entries as `Workspace / ParentNode1 / ParentNode2 / ...`
    - Clicking any breadcrumb entry calls `onNavigate` with the appropriate sheet index
    - Clicking "Workspace" navigates to root (clears sub-canvas stack)
    - Ensure breadcrumb and SheetTabBar navigation remain synchronized
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Wire updated Breadcrumb in `page.tsx`
    - Pass `subCanvasStack` from the store to the Breadcrumb component
    - Wire breadcrumb navigation to call `store.navigateToSheet` and trigger `renderElements`
    - _Requirements: 7.2, 7.3_

- [x] 10. Extend persistence for sub-canvas state
  - [x] 10.1 Add `subCanvasStack` and `sheetViewports` to `WorkspaceFile` in `file-workspace.ts`
    - Add optional `subCanvasStack?: SubCanvasEntry[]` field to `WorkspaceFile` interface
    - Add optional `sheetViewports?: Record<string, { x: number; y: number; zoom: number }>` field
    - Update `createEmptyWorkspace` to include defaults (`[]` and `{}`)
    - Update `parseWorkspace` to read these fields with fallback defaults
    - _Requirements: 6.1, 6.5_

  - [x] 10.2 Update `buildWorkspaceFile` and auto-save effect in `page.tsx` to capture sub-canvas state
    - Include `subCanvasStack` and `sheetViewports` from the store in the built `WorkspaceFile`
    - Update the auto-save `useEffect` to also capture these fields
    - _Requirements: 6.2, 6.3_

  - [x] 10.3 Update `loadWorkspace` and restore logic in `page.tsx` to restore sub-canvas state
    - On workspace load, set `subCanvasStack` and `sheetViewports` in the store from the loaded `WorkspaceFile`
    - Filter and display elements for the restored active sheet based on the restored `subCanvasStack`
    - Restore the active sheet's viewport
    - Validate `subCanvasStack` entries against loaded elements; filter out entries referencing deleted elements
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 10.4 Write property test: WorkspaceFile sub-canvas state round-trip (Property 7)
    - **Property 7: WorkspaceFile sub-canvas state round-trip**
    - Generate random SubCanvasEntry arrays and random sheetViewports maps
    - Serialize to JSON via `serializeWorkspace` and parse back via `parseWorkspace`
    - Assert `subCanvasStack` and `sheetViewports` are equivalent after round-trip
    - **Validates: Requirements 6.2, 6.3, 6.5**

- [x] 11. Handle New workspace reset for sub-canvas state
  - [x] 11.1 Update `handleNew` in `page.tsx` to clear sub-canvas state
    - Reset `subCanvasStack` to `[]` and `sheetViewports` to `{}` when creating a new workspace
    - _Requirements: 6.1_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, matching the existing codebase
- Sub-canvas navigation is independent of the existing C4 drill-down (`activeLevel` is unchanged)
- All persistence follows the mandatory two-tier system: IndexedDB auto-save + manual file save
