# C4 Diagramming Platform

A local-first, browser-based platform for creating and exploring C4 architecture diagrams. Design your system architecture visually on an infinite canvas and save it as a single `.c4.json` file — like Excalidraw, but for C4 models.

## Features

- **Single-file workspace** — one `.c4.json` file holds your entire diagram (elements, positions, colors, edge styles, viewport)
- **Infinite canvas** — pan, zoom, and arrange nodes freely with React Flow
- **Four C4 element types** — System (blue), Container (green), Component (purple), Code (gray)
- **Visual connections** — drag edges between nodes with four routing styles (Bezier, Straight, Step, Smooth Step)
- **Node customization** — resize nodes, change colors (8 options), edit properties via double-click
- **Auto-save** — workspace state is saved to IndexedDB every 2 seconds, survives page reloads
- **File persistence** — explicit Save/Save As writes to a `.c4.json` file on disk via File System Access API
- **Context menus** — right-click nodes to change color, right-click edges to change routing style
- **MiniMap** — overview navigation for large diagrams

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **Next.js 16** (App Router) | Application shell, routing, SSR isolation |
| UI | **React 19** + **Tailwind CSS 4** | Component rendering, styling |
| Canvas | **React Flow 11** | Infinite canvas, node/edge rendering, interactions |
| Layout | **ELK.js** | Automatic node positioning (layered algorithm) |
| State | **Zustand 5** | Transient diagram state management |
| Persistence | **IndexedDB** + **File System Access API** | Auto-save + explicit file save |
| Notifications | **Sonner** | Toast notifications |
| Testing | **Vitest** + **fast-check** | Unit tests + property-based tests |
| Language | **TypeScript 5** | Type safety throughout |

## Prerequisites

- **Node.js** 20+ (tested with 22.20.0)
- **npm** 10+
- **Chromium-based browser** (Chrome, Edge, Arc, Brave) — required for File System Access API

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a Chromium browser, then click **Open Canvas**.

## Scripts

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Serve production build
npm run test     # Run all tests
npm run lint     # Run ESLint
```

## Project Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── globals.css               # Tailwind + React Flow CSS overrides
│   └── canvas/
│       ├── page.tsx              # Main canvas page (client-side only)
│       └── loading.tsx           # Route loading skeleton
│
├── components/                   # React components
│   ├── Toolbar.tsx               # File actions (New/Open/Save) + Create Element
│   ├── Breadcrumb.tsx            # Drill-down navigation trail
│   ├── CreateElementForm.tsx     # New element form (modal)
│   ├── EditElementForm.tsx       # Edit element form (modal, double-click)
│   ├── EdgeContextMenu.tsx       # Right-click menu for edge style
│   ├── NodeContextMenu.tsx       # Right-click menu for node color
│   └── nodes/
│       ├── SystemNode.tsx        # C4 System node (blue, rounded)
│       ├── ContainerNode.tsx     # C4 Container node (green, dashed)
│       ├── ComponentNode.tsx     # C4 Component node (purple, solid)
│       ├── CodeNode.tsx          # C4 Code node (gray, monospace)
│       ├── BoundaryGroupNode.tsx # Visual grouping container
│       ├── node-colors.ts        # Shared color system (8 colors × full class sets)
│       └── index.ts              # Node type registry for React Flow
│
├── lib/                          # Core logic (no React dependencies)
│   ├── file-workspace.ts         # Single-file workspace format (.c4.json)
│   ├── workspace-persistence.ts  # IndexedDB auto-save + file handle storage
│   ├── workspace-service.ts      # File System Access API wrapper
│   ├── parser.ts                 # YAML frontmatter parser (gray-matter)
│   ├── serializer.ts             # Element → Markdown serializer
│   ├── transform.ts              # Element → React Flow node/edge conversion
│   ├── layout-engine.ts          # ELK.js layout wrapper + grid fallback
│   └── *.test.ts                 # Co-located unit tests
│
├── store/
│   └── diagram-store.ts          # Zustand store (state + actions + selectors)
│
└── types/
    ├── c4.ts                     # C4 model types (C4Type, C4Level, etc.)
    ├── layout.ts                 # Layout engine types
    ├── parser.ts                 # Parser result types
    ├── workspace.ts              # Workspace file entry type
    ├── file-system.d.ts          # File System Access API type declarations
    └── index.ts                  # Barrel export
```

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  .c4.json   │────▶│  Zustand     │────▶│  React Flow │
│  (on disk)  │     │  Store       │     │  Canvas     │
└─────────────┘     └──────────────┘     └─────────────┘
       ▲                   │                     │
       │              auto-save              user edits
       │                   ▼                     │
       │            ┌──────────────┐             │
       │            │  IndexedDB   │◀────────────┘
       │            │  (browser)   │
  Save button       └──────────────┘
```

1. **Open** — user picks a `.c4.json` file → parsed into elements → stored in Zustand → transformed to React Flow nodes/edges → layout computed by ELK.js → rendered on canvas
2. **Edit** — user moves/resizes/connects/colors nodes → Zustand updates → auto-saved to IndexedDB every 2s
3. **Save** — user clicks Save → current state serialized to JSON → written to `.c4.json` file on disk
4. **Reload** — IndexedDB state restored first (preserves unsaved changes) → file handle restored for Save

## File Format

The `.c4.json` file contains the complete workspace:

```json
{
  "version": 1,
  "name": "My Architecture",
  "elements": [
    {
      "id": "uuid-here",
      "type": "system",
      "name": "Payment System",
      "description": "Handles all payments",
      "technology": "Node.js",
      "relationships": [
        { "targetId": "other-uuid", "label": "Sends events to" }
      ]
    }
  ],
  "positions": {
    "uuid-here": { "x": 100, "y": 200, "width": 280, "height": 150 }
  },
  "edgeStyles": {
    "uuid-a-uuid-b": { "type": "smoothstep" }
  },
  "nodeColors": {
    "uuid-here": "cyan"
  },
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "activeLevel": "L1",
  "navigationStack": []
}
```

## Browser Support

Requires the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for open/save:

| Browser | Supported |
|---------|-----------|
| Chrome 86+ | ✅ |
| Edge 86+ | ✅ |
| Arc | ✅ |
| Brave | ✅ |
| Firefox | ❌ |
| Safari | ❌ |

Without the API, the canvas still works — you just can't open/save files to disk. The IndexedDB auto-save works in all browsers.

## License

Private project.
