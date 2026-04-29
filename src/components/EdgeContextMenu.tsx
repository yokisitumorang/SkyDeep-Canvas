'use client';

export type ArrowStyle = 'none' | 'target' | 'both';

interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  currentType: string;
  currentArrow: ArrowStyle;
  onChangeType: (edgeId: string, type: string) => void;
  onChangeArrow: (edgeId: string, arrow: ArrowStyle) => void;
  onClose: () => void;
}

const EDGE_TYPES = [
  { value: 'default', label: 'Bezier' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step' },
  { value: 'smoothstep', label: 'Smooth Step' },
];

const ARROW_OPTIONS: { value: ArrowStyle; label: string }[] = [
  { value: 'none', label: 'No Arrow' },
  { value: 'target', label: 'Arrow → Target' },
  { value: 'both', label: 'Arrow ↔ Both' },
];

export default function EdgeContextMenu({
  x,
  y,
  edgeId,
  currentType,
  currentArrow,
  onChangeType,
  onChangeArrow,
  onClose,
}: EdgeContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 min-w-[160px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
        style={{ left: x, top: y }}
      >
        <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
          Edge Style
        </p>
        {EDGE_TYPES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChangeType(edgeId, opt.value);
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              currentType === opt.value
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="my-1 border-t border-slate-100" />

        <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
          Arrow
        </p>
        {ARROW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChangeArrow(edgeId, opt.value);
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              currentArrow === opt.value
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}
