'use client';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  currentColor?: string;
  onChangeColor: (nodeId: string, color: string | undefined) => void;
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

export default function NodeContextMenu({
  x,
  y,
  nodeId,
  currentColor,
  onChangeColor,
  onClose,
}: NodeContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 min-w-[160px] rounded-md bg-white shadow-lg ring-1 ring-slate-200 py-1"
        style={{ left: x, top: y }}
      >
        <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
          Color
        </p>
        <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => {
                onChangeColor(nodeId, opt.value);
                onClose();
              }}
              className={`w-6 h-6 rounded-full ${opt.bg} transition-transform hover:scale-110 ${
                currentColor === opt.value
                  ? 'ring-2 ring-offset-2 ring-slate-900'
                  : ''
              }`}
            />
          ))}
        </div>
        {currentColor && (
          <button
            type="button"
            onClick={() => {
              onChangeColor(nodeId, undefined);
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Reset to default
          </button>
        )}
      </div>
    </>
  );
}
