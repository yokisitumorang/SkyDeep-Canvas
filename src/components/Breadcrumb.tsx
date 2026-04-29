'use client';

import type { NavigationEntry, SubCanvasEntry } from '@/store/diagram-store';

export interface BreadcrumbProps {
  stack: NavigationEntry[];
  onNavigate: (index: number) => void;
  subCanvasStack?: SubCanvasEntry[];
  onSubCanvasNavigate?: (index: number) => void;
}

export function Breadcrumb({ stack, onNavigate, subCanvasStack = [], onSubCanvasNavigate }: BreadcrumbProps) {
  const hasSubCanvas = subCanvasStack.length > 0;
  const hasC4Stack = stack.length > 0;

  // Determine if "Workspace" should be clickable:
  // clickable when there's a C4 navigation stack OR a sub-canvas stack
  const isWorkspaceClickable = hasC4Stack || hasSubCanvas;

  const handleWorkspaceClick = () => {
    if (hasSubCanvas && onSubCanvasNavigate) {
      // When in a sub-canvas, clicking Workspace navigates to root (clears sub-canvas stack)
      onSubCanvasNavigate(-1);
    }
    // Also reset C4 navigation if there's a stack
    if (hasC4Stack) {
      onNavigate(0);
    }
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium">
      {/* Workspace root entry — always present */}
      {!isWorkspaceClickable ? (
        <span className="text-slate-900">Workspace</span>
      ) : (
        <button
          type="button"
          onClick={handleWorkspaceClick}
          className="text-slate-500 hover:text-slate-700 cursor-pointer"
        >
          Workspace
        </button>
      )}

      {/* C4 Navigation stack entries */}
      {stack.map((entry, index) => {
        // When sub-canvas is active, all C4 entries are intermediate (clickable)
        // When no sub-canvas, last C4 entry is the current location (non-clickable)
        const isLast = !hasSubCanvas && index === stack.length - 1;

        return (
          <span key={`c4-${entry.level}-${entry.parentId ?? 'root'}`} className="flex items-center gap-2">
            <span className="text-slate-400" aria-hidden="true">/</span>
            {isLast ? (
              <span className="text-slate-900">{entry.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(index + 1)}
                className="text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {entry.label}
              </button>
            )}
          </span>
        );
      })}

      {/* Sub-canvas navigation entries */}
      {subCanvasStack.map((entry, index) => {
        const isLast = index === subCanvasStack.length - 1;

        return (
          <span key={`sub-${entry.parentId}`} className="flex items-center gap-2">
            <span className="text-slate-400" aria-hidden="true">/</span>
            {isLast ? (
              <span className="text-slate-900">{entry.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onSubCanvasNavigate?.(index)}
                className="text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {entry.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
