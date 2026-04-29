# Requirements Document

## Introduction

This feature adds multi-sheet/sub-canvas support to the C4 diagramming platform, similar to Excel sheet tabs or draw.io pages. Any node element on the canvas can have a sub-canvas created for it, allowing users to organize child elements in a dedicated sheet. Unlike the existing C4-level drill-down (system→container→component→code), sub-canvases are free-form: a parent node of any type can contain child elements of any type. Sub-canvas data is stored within the same `.c4.json` file using the existing `parentId` hierarchy. Users navigate between sheets via tab-like navigation at the bottom of the canvas.

## Glossary

- **Canvas**: The main React Flow drawing surface where nodes and edges are rendered
- **Sub_Canvas**: A dedicated sheet/view scoped to a single parent node, displaying only that node's child elements
- **Sheet_Tab_Bar**: A horizontal tab bar at the bottom of the canvas that lists all open sheets and allows switching between them
- **Sheet**: A single tab entry in the Sheet_Tab_Bar representing either the root canvas or a sub-canvas for a specific parent node
- **Sub_Canvas_Indicator**: A small visual icon rendered on a node to signal that the node has child elements in a sub-canvas
- **Context_Menu**: The right-click menu displayed on a node, providing actions such as color changes, font changes, and the new "Create Sub Level" action
- **Parent_Node**: A node element that has at least one child element (identified via `parentId`) and therefore owns a sub-canvas
- **Root_Canvas**: The top-level canvas view that shows elements with no `parentId`, equivalent to the workspace root
- **Navigation_Stack**: The ordered list of navigation entries tracking the user's drill-down path through sheets
- **Store**: The Zustand-based state management layer (`useDiagramStore`) that holds all elements, nodes, edges, and navigation state
- **WorkspaceFile**: The JSON structure persisted to the `.c4.json` file and IndexedDB, containing all elements, positions, edges, styles, and navigation state

## Requirements

### Requirement 1: Create Sub Level via Context Menu

**User Story:** As a user, I want to right-click any node and select "Create Sub Level" from the context menu, so that I can create a sub-canvas for that node.

#### Acceptance Criteria

1. WHEN a user right-clicks a node element, THE Context_Menu SHALL display a "Create Sub Level" option alongside existing color and font options
2. WHEN the user selects "Create Sub Level" from the Context_Menu, THE Store SHALL navigate to a new Sub_Canvas scoped to the selected node
3. WHEN the user selects "Create Sub Level" for a node that already has child elements, THE Store SHALL navigate to the existing Sub_Canvas for that node without creating duplicate entries
4. THE Context_Menu SHALL display the "Create Sub Level" option for nodes of all C4 types (system, container, component, code, simple)
5. THE Context_Menu SHALL NOT display the "Create Sub Level" option for text nodes or group nodes

### Requirement 2: Sub-Canvas Indicator on Nodes

**User Story:** As a user, I want to see a visual indicator on nodes that have a sub-canvas, so that I can identify which nodes contain child elements.

#### Acceptance Criteria

1. WHEN a node has one or more child elements (determined by any element having `parentId` equal to the node's `id`), THE Sub_Canvas_Indicator SHALL be rendered on that node
2. WHEN a node has zero child elements, THE Sub_Canvas_Indicator SHALL NOT be rendered on that node
3. THE Sub_Canvas_Indicator SHALL be a distinct icon visually distinguishable from other node content
4. WHEN a user clicks the Sub_Canvas_Indicator, THE Store SHALL navigate to the Sub_Canvas for that Parent_Node
5. THE Sub_Canvas_Indicator SHALL be displayed on all node types that support sub-canvases (system, container, component, code, simple)

### Requirement 3: Sub-Canvas Navigation and Element Filtering

**User Story:** As a user, I want to navigate into a sub-canvas and see only the child elements of the parent node, so that I can work on a focused subset of the diagram.

#### Acceptance Criteria

1. WHEN the user navigates to a Sub_Canvas for a Parent_Node, THE Canvas SHALL display only elements whose `parentId` matches the Parent_Node's `id`
2. WHEN the user navigates to a Sub_Canvas, THE Navigation_Stack SHALL record the navigation entry with the Parent_Node's id and label
3. WHEN the user navigates to a Sub_Canvas, THE Store SHALL update the active navigation context independently of the C4 level (the `activeLevel` SHALL remain unchanged)
4. WHEN the Sub_Canvas contains zero child elements, THE Canvas SHALL display an empty state indicating no elements exist yet
5. THE Sub_Canvas navigation SHALL support nesting: a node within a Sub_Canvas SHALL be able to have its own Sub_Canvas

### Requirement 4: Full Canvas Features in Sub-Canvas

**User Story:** As a user, I want the sub-canvas to support all the same features as the root canvas, so that I can create and edit elements within a sub-canvas without limitations.

#### Acceptance Criteria

1. WHILE viewing a Sub_Canvas, THE Canvas SHALL allow creating new node elements of any C4 type (system, container, component, code, text, group, simple)
2. WHILE viewing a Sub_Canvas, THE Canvas SHALL assign the Parent_Node's `id` as the `parentId` for all newly created elements
3. WHILE viewing a Sub_Canvas, THE Canvas SHALL allow creating, editing, and deleting edges between visible elements
4. WHILE viewing a Sub_Canvas, THE Canvas SHALL allow node repositioning, resizing, color changes, font changes, and all other visual editing operations
5. WHILE viewing a Sub_Canvas, THE Canvas SHALL allow copy and paste of nodes within the Sub_Canvas

### Requirement 5: Sheet Tab Bar Navigation

**User Story:** As a user, I want a tab bar at the bottom of the canvas showing my open sheets, so that I can switch between the root canvas and sub-canvases like switching between Excel sheets.

#### Acceptance Criteria

1. THE Sheet_Tab_Bar SHALL be rendered at the bottom of the canvas area
2. THE Sheet_Tab_Bar SHALL always display a "Root" tab representing the Root_Canvas
3. WHEN the user navigates to a Sub_Canvas, THE Sheet_Tab_Bar SHALL display a tab for each entry in the Navigation_Stack plus the Root tab
4. WHEN the user clicks a tab in the Sheet_Tab_Bar, THE Store SHALL navigate to the corresponding sheet (root or sub-canvas) and update the Canvas to display the appropriate elements
5. THE Sheet_Tab_Bar SHALL visually highlight the currently active tab to indicate which sheet the user is viewing
6. THE Sheet_Tab_Bar SHALL display the Parent_Node's name as the tab label for each Sub_Canvas tab

### Requirement 6: Persistence of Sub-Canvas State

**User Story:** As a user, I want sub-canvas data to be saved within the same `.c4.json` file, so that my sub-canvas work is preserved across sessions.

#### Acceptance Criteria

1. THE WorkspaceFile SHALL store child elements using the existing `parentId` field on ArchitectureElement, with no changes to the file format schema
2. WHEN the workspace is saved (to file or IndexedDB), THE WorkspaceFile SHALL include positions, edge styles, node colors, and text fonts for elements across all sub-canvases
3. WHEN the workspace is restored from file or IndexedDB, THE Store SHALL restore the Navigation_Stack and display the previously active sheet
4. WHEN the workspace is restored, THE Canvas SHALL correctly filter and display elements for the active sheet based on the restored Navigation_Stack
5. THE WorkspaceFile SHALL store per-sheet viewport state (position and zoom) so that each sheet restores to its previous camera position

### Requirement 7: Breadcrumb Integration with Sub-Canvas Navigation

**User Story:** As a user, I want the breadcrumb to reflect my sub-canvas navigation path, so that I can see where I am and navigate back to parent sheets.

#### Acceptance Criteria

1. WHEN the user navigates to a Sub_Canvas, THE Breadcrumb SHALL display the full navigation path from Root_Canvas to the current Sub_Canvas
2. WHEN the user clicks a breadcrumb entry, THE Store SHALL navigate to the corresponding sheet and update the Canvas accordingly
3. WHEN the user clicks the "Workspace" root breadcrumb entry, THE Store SHALL navigate to the Root_Canvas and clear the Navigation_Stack
4. THE Breadcrumb navigation and Sheet_Tab_Bar navigation SHALL remain synchronized: clicking either control SHALL produce the same navigation result
