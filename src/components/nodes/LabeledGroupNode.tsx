'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface LabeledGroupNodeData {
  label: string;
  onLabelChange: (nodeId: string, label: string) => void;
}

function LabeledGroupNode({ id, data, selected }: NodeProps<LabeledGroupNodeData>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="h-full w-full rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/10">
      <NodeResizer
        isVisible={!!selected}
        minWidth={160}
        minHeight={80}
        lineClassName="!border-transparent"
        handleClassName="!bg-indigo-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm"
      />

      <div className="absolute top-2 left-3">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-transparent border-b border-indigo-300 outline-none"
            style={{ minWidth: 60 }}
          />
        ) : (
          <p
            className="text-xs font-semibold uppercase tracking-wider text-indigo-400 cursor-text select-none"
            onDoubleClick={() => {
              setEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            {data.label || 'Group'}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(LabeledGroupNode);
