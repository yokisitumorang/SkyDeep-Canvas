'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface LabeledGroupNodeData {
  label: string;
  customColor?: string;
  onLabelChange: (nodeId: string, label: string) => void;
}

/** Maps color names to group-specific Tailwind classes */
const GROUP_COLORS: Record<string, { border: string; bg: string; text: string; resizer: string }> = {
  blue:   { border: 'border-blue-300',   bg: 'bg-blue-50/40',   text: 'text-blue-500',   resizer: '!bg-blue-500' },
  green:  { border: 'border-green-300',  bg: 'bg-green-50/40',  text: 'text-green-500',  resizer: '!bg-green-500' },
  purple: { border: 'border-purple-300', bg: 'bg-purple-50/40', text: 'text-purple-500', resizer: '!bg-purple-500' },
  red:    { border: 'border-red-300',    bg: 'bg-red-50/40',    text: 'text-red-500',    resizer: '!bg-red-500' },
  amber:  { border: 'border-amber-300',  bg: 'bg-amber-50/40',  text: 'text-amber-500',  resizer: '!bg-amber-500' },
  cyan:   { border: 'border-cyan-300',   bg: 'bg-cyan-50/40',   text: 'text-cyan-500',   resizer: '!bg-cyan-500' },
  pink:   { border: 'border-pink-300',   bg: 'bg-pink-50/40',   text: 'text-pink-500',   resizer: '!bg-pink-500' },
  slate:  { border: 'border-slate-300',  bg: 'bg-slate-50/40',  text: 'text-slate-500',  resizer: '!bg-slate-500' },
};

const DEFAULT_COLOR = {
  border: 'border-indigo-300',
  bg: 'bg-indigo-50/10',
  text: 'text-indigo-400',
  resizer: '!bg-indigo-500',
};

function LabeledGroupNode({ id, data, selected }: NodeProps<LabeledGroupNodeData>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = data.customColor ? (GROUP_COLORS[data.customColor] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

  useEffect(() => {
    if (!editing) setDraft(data.label);
  }, [data.label, editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim() || 'Group';
    setDraft(trimmed);
    data.onLabelChange(id, trimmed);
  }, [draft, id, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setDraft(data.label); setEditing(false); }
  }, [commit, data.label]);

  return (
    <>
      {/* Title positioned above the dotted border */}
      <div className="absolute -top-5 left-3 z-10">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            className={`text-xs font-semibold uppercase tracking-wider ${colors.text} bg-transparent border-b border-current outline-none`}
            style={{ minWidth: 60 }}
          />
        ) : (
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${colors.text} cursor-text select-none`}
            onDoubleClick={() => {
              setEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            {data.label || 'Group'}
          </p>
        )}
      </div>

      {/* Dotted border only — no box wrapper */}
      <div className={`h-full w-full rounded-lg border-2 border-dashed ${colors.border} ${colors.bg}`}>
        <NodeResizer
          isVisible={!!selected}
          minWidth={160}
          minHeight={80}
          lineClassName="!border-transparent"
          handleClassName={`${colors.resizer} !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm`}
        />
      </div>
    </>
  );
}

export default memo(LabeledGroupNode);
