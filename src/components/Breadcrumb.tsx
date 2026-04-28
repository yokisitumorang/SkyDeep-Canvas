'use client';

import type { NavigationEntry } from '@/store/diagram-store';

export interface BreadcrumbProps {
  stack: NavigationEntry[];
  onNavigate: (index: number) => void;
}

export function Breadcrumb({ stack, onNavigate }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium">
      {/* Workspace root entry — always present */}
      {stack.length === 0 ? (
        <span className="text-slate-900">Workspace</span>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate(0)}
          className="text-slate-500 hover:text-slate-700 cursor-pointer"
        >
          Workspace
        </button>
      )}

      {/* Navigation stack entries */}
      {stack.map((entry, index) => {
        const isLast = index === stack.length - 1;

        return (
          <span key={`${entry.level}-${entry.parentId ?? 'root'}`} className="flex items-center gap-2">
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
    </nav>
  );
}
