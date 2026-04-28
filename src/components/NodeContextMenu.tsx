'use client';

import type { TextFont } from './TextContextMenu';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeType?: string;
  currentColor?: string;
  currentFont?: TextFont;
  onChangeColor: (nodeId: string, color: string | undefined) => void;
  onChangeFont: (nodeId: string, font: TextFont) => void;
  onUngroup?: (nodeId: string) => void;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-400' },
  { value: 'green', label: 'Green', bg: 'bg-green-400' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-400' },
  { value: 'red', label: 'Red', bg: 'bg-red-400' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-400' },
  { value: 'cyan', label: 'Cyan', bg: 'bg-cyan-400' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-400' },
  { value: 'slate', label: 'Gray', bg: 'bg-slate-400' },
];

const FONT_OPTIONS: { value: TextFont; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'virgil', label: 'Sketch style' },
];

export default function NodeContextMenu({
  x,
  y,
  nodeId,
  nodeType,
  currentColor,
  currentFont,
  onChangeColor,
  onChangeFont,
  onUngroup,
  onClose,
}: NodeContextMenuProps) {
  const isGroup = nodeType === 'group';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 min-w-[160px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
        style={{ left: x, top: y }}
      >
        {isGroup ? (
          <button
            type="button"
            onClick={() => { onUngroup?.(nodeId); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h7v7H3z" /><path d="M14 3h7v7h-7z" />
              <path d="M3 14h7v7H3z" /><path d="M14 14h7v7h-7z" />
            </svg>
            Ungroup
          </button>
        ) : (
          <>
            <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Color
            </p>
            <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  onClick={() => { onChangeColor(nodeId, opt.value); onClose(); }}
                  className={`w-6 h-6 rounded-full ${opt.bg} transition-transform hover:scale-110 ${
                    currentColor === opt.value ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                  }`}
                />
              ))}
            </div>
            {currentColor && (
              <button
                type="button"
                onClick={() => { onChangeColor(nodeId, undefined); onClose(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Reset color
              </button>
            )}

            <div className="my-1 border-t border-slate-100" />

            <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Font
            </p>
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChangeFont(nodeId, opt.value); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                  (currentFont ?? 'virgil') === opt.value ? 'text-indigo-600 font-medium' : 'text-slate-700'
                }`}
              >
                <span
                  className="text-sm w-5 text-center shrink-0"
                  style={{ fontFamily: opt.value === 'virgil' ? 'Virgil, sans-serif' : 'inherit' }}
                >
                  Aa
                </span>
                {opt.label}
                {(currentFont ?? 'virgil') === opt.value && (
                  <svg className="ml-auto h-3 w-3 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
