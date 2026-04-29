'use client';

import type { SubCanvasEntry } from '@/store/diagram-store';

export interface SheetTabBarProps {
  subCanvasStack: SubCanvasEntry[];
  activeIndex: number; // -1 for root, 0+ for subCanvasStack index
  onSelectSheet: (index: number) => void;
}

export default function SheetTabBar({
  subCanvasStack,
  activeIndex,
  onSelectSheet,
}: SheetTabBarProps) {
  const isRootActive = activeIndex === -1;

  return (
    <nav
      aria-label="Sheet tabs"
      className="flex items-center gap-1 border-t border-slate-200 bg-white px-2 py-1"
    >
      {/* Root tab — always present */}
      <button
        type="button"
        onClick={() => onSelectSheet(-1)}
        className={
          isRootActive
            ? 'text-sm font-semibold text-white px-3 py-1 bg-indigo-600 rounded-md shadow-sm'
            : 'text-sm font-medium text-slate-600 px-3 py-1 rounded-md hover:bg-slate-100 transition-colors'
        }
      >
        Root
      </button>

      {/* Sub-canvas tabs */}
      {subCanvasStack.map((entry, index) => {
        const isActive = activeIndex === index;

        return (
          <button
            key={`${entry.parentId}-${index}`}
            type="button"
            onClick={() => onSelectSheet(index)}
            className={
              isActive
                ? 'text-sm font-semibold text-white px-3 py-1 bg-indigo-600 rounded-md shadow-sm'
                : 'text-sm font-medium text-slate-600 px-3 py-1 rounded-md hover:bg-slate-100 transition-colors'
            }
          >
            {entry.label}
          </button>
        );
      })}
    </nav>
  );
}
