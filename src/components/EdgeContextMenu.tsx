'use client';

interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  currentType: string;
  onChangeType: (edgeId: string, type: string) => void;
  onClose: () => void;
}

const EDGE_TYPES = [
  { value: 'default', label: 'Bezier' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step' },
  { value: 'smoothstep', label: 'Smooth Step' },
];

export default function EdgeContextMenu({
  x,
  y,
  edgeId,
  currentType,
  onChangeType,
  onClose,
}: EdgeContextMenuProps) {
  return (
    <>
      {/* Invisible backdrop to close menu on click outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 min-w-[140px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
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
      </div>
    </>
  );
}
