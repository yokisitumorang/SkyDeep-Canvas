# Implementation Plan: C4 Diagramming Platform

## Overview

Build a local-first, browser-based C4 architecture diagramming platform using Next.js (App Router), React Flow, ELK.js, Zustand, and gray-matter. Implementation proceeds bottom-up: data models and types first, then data layer (parser, serializer, workspace service), state management, layout engine, custom node/edge components, canvas composition, and finally the app shell with routing. Each task builds incrementally on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Initialize project and define core data models
  - [x] 1.1 Scaffold Next.js project with App Router and install dependencies
    - Initialize a Next.js project with TypeScript and App Router (`app/` directory)
    - Install dependencies: `reactflow`, `elkjs`, `zustand`, `gray-matter`, `sonner`
    - Install dev dependencies: `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
    - Configure Vitest in `vitest.config.ts` with jsdom environment and path aliases
    - Configure Tailwind CSS with the project
    - _Requirements: 12.3_

  - [x] 1.2 Create core TypeScript types and interfaces
    - Create `src/types/c4.ts` with `C4Type`, `C4Level`, `Relationship`, `ArchitectureElement`, `C4NodeData` types
    - Create `src/types/workspace.ts` with `WorkspaceFileEntry` interface
    - Create `src/types/parser.ts` with `ParseResult`, `ParseError`, `ParseOutcome`, `ValidationResult` types
    - Create `src/types/layout.ts` with `LayoutInput`, `LayoutNode`, `LayoutEdge`, `BoundaryGroup`, `LayoutResult`, `EdgeSection` types
    - Create `src/types/index.ts` barrel export
    - _Requirements: 2.1, 2.4, 4.2, 5.1, 9.1_

- [x] 2. Implement Parser module
  - [x] 2.1 Implement `parseFile` and `validateFrontmatter` functions
    - Create `src/lib/parser.ts` implementing the `ParserModule` interface
    - Use `gray-matter` to extract YAML frontmatter and Markdown body as separate structures
    - Implement `validateFrontmatter` to check required fields: `id`, `type`, `name`, `description`
    - Validate `type` field against accepted values (`system`, `container`, `component`, `code`); return error with invalid type and accepted values list
    - Map `type` field to C4 level (system→L1, container→L2, component→L3, code→L4)
    - Extract `relationships` array from frontmatter
    - Return `ParseError` with file path and descriptive message for malformed YAML or missing fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1_

  - [ ]* 2.2 Write property test: Frontmatter Required Field Validation
    - **Property 4: Frontmatter Required Field Validation**
    - Generate frontmatter objects with random subsets of required fields (`id`, `type`, `name`, `description`) removed using `fc.record()` and `fc.constantFrom()`
    - Assert `validateFrontmatter` returns `valid: false` and `errors` array identifies each missing field by name
    - Minimum 100 iterations
    - **Validates: Requirements 2.2**

  - [ ]* 2.3 Write property test: Invalid C4 Type Rejection
    - **Property 5: Invalid C4 Type Rejection**
    - Generate random strings excluding `system`, `container`, `component`, `code` via `fc.string().filter()`
    - Assert validation error contains both the invalid type value and the list of accepted values
    - Minimum 100 iterations
    - **Validates: Requirements 2.5**

- [x] 3. Implement Serializer module
  - [x] 3.1 Implement `serialize` and `generateId` functions
    - Create `src/lib/serializer.ts` implementing the `SerializerModule` interface
    - Use `gray-matter` `stringify` to produce Markdown with YAML frontmatter
    - Ensure consistent field ordering (`id`, `type`, `name`, `description`, `technology`, `parentId`, `boundary`, `relationships`) and indentation
    - Preserve Markdown body content when serializing
    - Implement `generateId()` using `crypto.randomUUID()` for unique ID generation
    - _Requirements: 3.1, 3.2, 3.3, 11.3_

  - [ ]* 3.2 Write property test: Parse-Serialize Round-Trip
    - **Property 1: Parse-Serialize Round-Trip**
    - Generate random `ArchitectureElement` objects with `fc.record()` and random body strings with `fc.string()`
    - Serialize element+body → parse result → assert equivalent element and identical body
    - Also test: parse → serialize → parse produces equivalent data structure
    - Minimum 100 iterations
    - **Validates: Requirements 2.6, 3.2, 3.5, 9.1**

  - [ ]* 3.3 Write property test: Serialization Idempotence
    - **Property 2: Serialization Idempotence**
    - Generate random elements and body content, serialize twice, assert byte-identical output strings
    - Minimum 100 iterations
    - **Validates: Requirements 3.3**

  - [ ]* 3.4 Write property test: Generated ID Uniqueness
    - **Property 18: Generated ID Uniqueness**
    - Generate N (via `fc.integer({min: 2, max: 500})`) calls to `generateId()`, assert all N values are distinct
    - Minimum 100 iterations
    - **Validates: Requirements 11.3**

- [x] 4. Implement WorkspaceService
  - [x] 4.1 Implement workspace file system operations
    - Create `src/lib/workspace-service.ts` implementing the `WorkspaceService` interface
    - Implement `isSupported()` checking `'showDirectoryPicker' in window`
    - Implement `openWorkspace()` calling `window.showDirectoryPicker()`, catching `AbortError` silently
    - Implement `scanFiles()` iterating directory entries, filtering to `.md` extension only
    - Implement `readFile()` and `writeFile()` using `FileSystemFileHandle` API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 4.2 Write property test: Workspace File Scanning Filters
    - **Property 3: Workspace File Scanning Filters**
    - Generate arrays of file entry objects with random extensions (`.md`, `.txt`, `.yaml`, `.json`, etc.)
    - Assert scanner returns exactly the `.md` entries and no others
    - Minimum 100 iterations
    - **Validates: Requirements 1.5**

- [x] 5. Checkpoint - Core data layer verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Diagram Store with Zustand
  - [x] 6.1 Create the Zustand store with state and actions
    - Create `src/store/diagram-store.ts` implementing `DiagramState` and `DiagramActions`
    - Initialize state: `directoryHandle: null`, `workspaceName: null`, `allElements: []`, `parseErrors: []`, `nodes: []`, `edges: []`, `activeLevel: 'L1'`, `navigationStack: []`, `viewport: { x: 0, y: 0, zoom: 1 }`
    - Implement `setWorkspace`, `setElements`, `setNodes`, `setEdges`, `setViewport` actions
    - Implement `addElement`, `updateElement`, `removeElement` CRUD actions
    - Implement `drillDown(nodeId)`: push current level to navigation stack, filter children of the activated node at the next C4 level, update `activeLevel`
    - Implement `navigateToBreadcrumb(index)`: slice navigation stack to index, restore nodes/edges for that level
    - Export selector hooks: `useNodes`, `useEdges`, `useActiveLevel`, `useNavigationStack`, `useViewport`, `useAllElements`, `useParseErrors`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 6.2 Implement element-to-node and relationship-to-edge transformation logic
    - Create `src/lib/transform.ts` with functions to convert `ArchitectureElement[]` to React Flow nodes and edges
    - Implement `elementsToNodes(elements, allElements)`: filter elements by active level, compute `hasChildren` flag by checking if any element has `parentId` matching the node's `id`, map to `ReactFlowNode` with correct `type` and `C4NodeData`
    - Implement `elementsToEdges(elements, allElements)`: extract relationships from visible elements, create `ReactFlowEdge` with `smoothstep` type, set `label` and `technology` from relationship data, set `hasWarning: true` for dangling references (targetId not found in allElements)
    - _Requirements: 4.1, 6.1, 6.7, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 6.3 Write property test: Store CRUD Reactivity
    - **Property 13: Store CRUD Reactivity**
    - Generate random sequences of add/update/remove operations using `fc.commands()` or `fc.array()`
    - After each operation, assert store state reflects the change: added items present, updated items have new values, removed items absent
    - Minimum 100 iterations
    - **Validates: Requirements 8.5**

  - [ ]* 6.4 Write property test: Initial Render Level Filtering
    - **Property 6: Initial Render Level Filtering**
    - Generate mixed-type `ArchitectureElement` arrays with `fc.array(fc.record(...))`
    - Filter to L1 (systems only), assert resulting node set contains exactly elements where `type === 'system'`
    - Minimum 100 iterations
    - **Validates: Requirements 4.1**

  - [ ]* 6.5 Write property test: Drill-Down Shows Only Children at Next Level
    - **Property 9: Drill-Down Shows Only Children at Next Level**
    - Generate element hierarchies with parent-child relationships
    - Perform drill-down on a parent, assert resulting nodes are exactly the direct children at the next C4 level, and activeLevel advances by one
    - Minimum 100 iterations
    - **Validates: Requirements 6.1, 8.2**

  - [ ]* 6.6 Write property test: Breadcrumb Navigation Consistency
    - **Property 10: Breadcrumb Navigation Consistency**
    - Generate sequences of drill-down operations through valid hierarchies
    - Navigate back to random breadcrumb indices, verify rendered nodes match that level and activeLevel matches breadcrumb entry's level
    - Minimum 100 iterations
    - **Validates: Requirements 6.5, 6.6, 8.3**

  - [ ]* 6.7 Write property test: hasChildren Flag Correctness
    - **Property 11: hasChildren Flag Correctness**
    - Generate element sets with random `parentId` references
    - Assert `hasChildren` is `true` iff at least one other element's `parentId` equals the element's `id`
    - Minimum 100 iterations
    - **Validates: Requirements 6.7**

  - [ ]* 6.8 Write property test: Edge Creation from Relationships
    - **Property 14: Edge Creation from Relationships**
    - Generate element sets where element A has a relationship targeting element B's `id`, both in current view
    - Assert an edge exists connecting A to B
    - Minimum 100 iterations
    - **Validates: Requirements 9.2**

  - [ ]* 6.9 Write property test: Edge Data Completeness
    - **Property 15: Edge Data Completeness**
    - Generate relationships with random `label` and `technology` fields
    - Assert corresponding edges carry the label and technology values
    - Minimum 100 iterations
    - **Validates: Requirements 9.3, 9.4**

  - [ ]* 6.10 Write property test: Dangling Reference Warning
    - **Property 16: Dangling Reference Warning**
    - Generate element sets with some relationships pointing to non-existent IDs
    - Assert those edges have `hasWarning: true`
    - Minimum 100 iterations
    - **Validates: Requirements 9.5**

  - [ ]* 6.11 Write property test: Viewport Preservation During Refresh
    - **Property 17: Viewport Preservation During Refresh**
    - Generate random viewport states (`x`, `y`, `zoom`), trigger refresh, assert viewport is identical post-refresh
    - Minimum 100 iterations
    - **Validates: Requirements 10.5**

- [x] 7. Implement Layout Engine
  - [x] 7.1 Implement ELK.js layout wrapper
    - Create `src/lib/layout-engine.ts` implementing the `LayoutEngine` interface
    - Configure ELK.js with `layered` algorithm, `ORTHOGONAL` edge routing, `INCLUDE_CHILDREN` hierarchy handling
    - Set node spacing (50h, 50v) and layer spacing (80)
    - Transform `LayoutInput` into ELK graph format (`ElkGraph`, `ElkNode`, `ElkEdge`)
    - Handle boundary groups by nesting child `ElkNode` objects within parent nodes
    - Extract computed positions from ELK result and map back to `LayoutResult`
    - Implement 5-second timeout wrapper; fall back to grid layout on timeout or error
    - Implement grid layout fallback (evenly spaced positions)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 Write property test: Non-Overlapping Layout
    - **Property 7: Non-Overlapping Layout**
    - Generate node arrays with random widths/heights (20–300px) using `fc.array(fc.record(...))`
    - Run ELK layout, check all pairs of node bounding boxes for zero intersection area
    - Minimum 100 iterations
    - **Validates: Requirements 5.1, 5.5**

  - [ ]* 7.3 Write property test: Boundary Group Containment
    - **Property 8: Boundary Group Containment**
    - Generate hierarchical node structures with boundary groups
    - Run layout, verify each child node's bounding box is fully contained within its boundary group's bounding box
    - Minimum 100 iterations
    - **Validates: Requirements 5.3**

- [x] 8. Checkpoint - State and layout verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement custom node and edge components
  - [x] 9.1 Create SystemNode, ContainerNode, ComponentNode, and CodeNode components
    - Create `src/components/nodes/SystemNode.tsx`: rounded rectangle, blue-toned background (`bg-blue-50 ring-blue-300`), system icon, displays name, description, technology
    - Create `src/components/nodes/ContainerNode.tsx`: dashed border, green-toned background (`bg-green-50 ring-green-300`), container icon, displays name, description, technology
    - Create `src/components/nodes/ComponentNode.tsx`: solid border, purple-toned background (`bg-purple-50 ring-purple-300`), component icon, displays name, description, technology
    - Create `src/components/nodes/CodeNode.tsx`: monospace font, gray-toned background (`bg-slate-50 ring-slate-300`), code icon, displays name, description, technology
    - Each component receives `C4NodeData` via React Flow's `data` prop
    - Implement drill-down on double-click when `hasChildren` is true; show muted style when `hasChildren` is false
    - Include React Flow `Handle` components for edge connections
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 6.7_

  - [x] 9.2 Create BoundaryGroupNode component
    - Create `src/components/nodes/BoundaryGroupNode.tsx`: dashed border container with label header, transparent background
    - Style as a visually distinct grouping container enclosing child nodes
    - _Requirements: 7.6_

  - [x] 9.3 Create node type registry and edge configuration
    - Create `src/components/nodes/index.ts` exporting `nodeTypes` object mapping `system`, `container`, `component`, `code`, `boundary` to their components
    - Configure default edge type as `smoothstep` for orthogonal routing
    - _Requirements: 4.5, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.4 Write property test: Node Content Completeness
    - **Property 12: Node Content Completeness**
    - Generate `ArchitectureElement` objects with random non-empty `name`, `description`, and `technology`
    - Render each node component with React Testing Library, assert all three values appear as visible text
    - Minimum 100 iterations
    - **Validates: Requirements 7.5**

- [x] 10. Implement Breadcrumb Navigation component
  - [x] 10.1 Create Breadcrumb component
    - Create `src/components/Breadcrumb.tsx` implementing `BreadcrumbProps`
    - Render navigation stack as clickable breadcrumb trail (e.g., "Workspace > System Name > Container Name")
    - Call `onNavigate(index)` when a breadcrumb entry is clicked
    - Style the active (last) entry differently from clickable ancestors
    - Use Tailwind: `text-sm font-medium`, `text-slate-500` for ancestors, `text-slate-900` for active
    - _Requirements: 6.5, 6.6_

- [x] 11. Implement Element Creation Form
  - [x] 11.1 Create the element creation form component
    - Create `src/components/CreateElementForm.tsx` implementing `CreateElementFormProps`
    - Render form fields: name (text input), type (select with `system`, `container`, `component`, `code`), description (textarea), technology (optional text input)
    - Implement client-side validation: required fields are `name`, `type`, `description`; display validation errors identifying each missing field by name
    - On submit, call `onSubmit` with `CreateElementFormData`; on cancel, call `onCancel`
    - Style using Tailwind form conventions from the UI standards (labels: `text-sm font-medium text-slate-900`, inputs: `text-sm ring-1 ring-slate-300`, errors: `text-xs text-red-600`)
    - _Requirements: 11.1, 11.5_

  - [ ]* 11.2 Write property test: Form Validation Identifies Missing Fields
    - **Property 19: Form Validation Identifies Missing Fields**
    - Generate form data with random subsets of required fields (`name`, `type`, `description`) missing or empty
    - Assert validation result identifies each missing field by name
    - Minimum 100 iterations
    - **Validates: Requirements 11.5**

- [x] 12. Implement Toolbar component
  - [x] 12.1 Create Toolbar with Open Workspace, Create Element, and Refresh actions
    - Create `src/components/Toolbar.tsx` with three action buttons
    - "Open Workspace" button: calls `WorkspaceService.openWorkspace()`, triggers file scan, parse, and layout pipeline
    - "Create Element" button: opens the `CreateElementForm` in a modal/panel overlay
    - "Refresh" button: calls `refreshWorkspace()` on the diagram store
    - Show browser compatibility error if `WorkspaceService.isSupported()` returns false
    - Style buttons using Tailwind: primary (`bg-indigo-600 text-white`), secondary (`bg-white ring-1 ring-slate-300`)
    - _Requirements: 1.1, 1.3, 10.1, 11.1_

- [x] 13. Compose Canvas route page
  - [x] 13.1 Build the canvas page with React Flow and all sub-components
    - Create `app/canvas/page.tsx` with `"use client"` directive
    - Wrap content in `ReactFlowProvider`
    - Render `ReactFlow` component with `nodeTypes` registry, `panOnDrag`, `zoomOnScroll` enabled
    - Wire nodes and edges from Zustand store via selectors (`useNodes`, `useEdges`)
    - Integrate `Toolbar` component as a panel overlay
    - Integrate `Breadcrumb` component above the canvas
    - Implement empty state overlay when no nodes are present: guide user to open a workspace or create an element
    - Implement loading indicator while workspace is being parsed and layout computed
    - Handle `onViewportChange` to sync viewport state to store
    - Wire drill-down: pass `onDrillDown` callback through node data, calling `drillDown(nodeId)` on the store
    - Integrate Sonner `<Toaster position="bottom-right" />` for toast notifications
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.4, 12.1, 12.4_

  - [x] 13.2 Implement workspace open → parse → layout → render pipeline
    - Wire the full data flow: `openWorkspace()` → `scanFiles()` → `readFile()` for each → `parseFile()` → `setElements()` → `elementsToNodes/Edges()` → `computeLayout()` → `setNodes/setEdges()`
    - Handle parse errors: collect `ParseError` results, store in `parseErrors`, skip failed files
    - Handle write failures: catch errors in `writeFile`, display Sonner toast with file name and error reason
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.3, 3.1, 3.4, 5.4_

  - [x] 13.3 Implement refresh workspace flow
    - Wire refresh button to re-read all `.md` files from the stored directory handle
    - Re-parse all files, diff with current `allElements`, update store
    - Handle additions (new files → new nodes), deletions (removed files → removed nodes), modifications (changed files → updated nodes)
    - Preserve viewport position and zoom level during refresh by saving and restoring viewport state
    - Trigger layout recomputation after refresh
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 13.4 Implement element creation flow
    - Wire `CreateElementForm` submit to: generate ID via `serializer.generateId()`, serialize element to Markdown, write file via `WorkspaceService.writeFile()`, add element to store, trigger layout recomputation
    - Set `parentId` based on current drill-down context
    - Display success toast on creation, error toast on write failure
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 14. Checkpoint - Canvas integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement Next.js App Shell and Landing Page
  - [x] 15.1 Create landing page and app layout
    - Create `app/page.tsx` as the landing page introducing the platform
    - Include a heading, brief description of the C4 diagramming platform, and a prominent navigation link/button to `/canvas`
    - Create `app/layout.tsx` with root HTML structure, Tailwind CSS globals, and metadata
    - Style landing page using Tailwind: `text-2xl font-bold text-slate-900` for heading, primary button to navigate to canvas
    - _Requirements: 12.2, 12.3_

  - [x] 15.2 Add loading state for canvas route
    - Create `app/canvas/loading.tsx` with a loading indicator (spinner or skeleton)
    - Display while React Flow and Layout Engine are initializing
    - _Requirements: 12.4_

- [x] 16. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties from the design document (19 properties total)
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript throughout, matching the design document
- All UI components follow the Tailwind CSS standards defined in the workspace steering rules
