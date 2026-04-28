'use client';

export type TextFont = 'default' | 'virgil';

interface TextContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  currentFont: TextFont;
  onChangeFont: (nodeId: string, font: TextFont) => void;
  onClose: () => void;
}

const FONT_OPTIONS: { value: TextFont; label: string; preview: string }[] = [
  { value: 'default', label: 'Default', preview: 'Aa' },
  { value: 'virgil', label: 'Sketch style', preview: 'Aa' },
];

export default function TextContextMenu({
  x,
  y,
  nodeId,
  currentFont,
  onChangeFont,
  onClose,
}: TextContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[160px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
        style={{ left: x, top: y }}
      >
        <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
          Font
        </p>
        {FONT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChangeFont(nodeId, opt.value); onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
              currentFont === opt.value ? 'text-indigo-600' : 'text-slate-700'
            }`}
          >
            <span
              className="text-base w-6 text-center shrink-0"
              style={{ fontFamily: opt.value === 'virgil' ? 'Virgil, sans-serif' : 'inherit' }}
            >
              {opt.preview}
            </span>
            <span className="text-xs font-medium">{opt.label}</span>
            {currentFont === opt.value && (
              <svg className="ml-auto h-3.5 w-3.5 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
