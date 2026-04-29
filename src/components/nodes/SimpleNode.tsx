'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from '@/components/base-node';

export interface SimpleNodeData {
  label?: string;
  description?: string;
  hasChildren?: boolean;
  onLabelChange?: (newLabel: string) => void;
  onDrillDown?: (nodeId: string) => void;
  [key: string]: unknown;
}

function SimpleNode({ id, data, selected }: NodeProps<SimpleNodeData>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label || 'Simple Node');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when data.label changes externally
  useEffect(() => {
    if (!editing) {
      setDraft(data.label || 'Simple Node');
    }
  }, [data.label, editing]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    const finalLabel = trimmed || 'Simple Node';
    setDraft(finalLabel);
    if (data.onLabelChange) {
      data.onLabelChange(finalLabel);
    }
  }, [draft, data]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitEdit();
      }
      if (e.key === 'Escape') {
        setDraft(data.label || 'Simple Node');
        setEditing(false);
      }
    },
    [commitEdit, data.label],
  );

  return (
    <BaseNode
      className={`w-[220px] ${
        selected ? 'ring-2 ring-indigo-400 shadow-md border-indigo-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />

      <BaseNodeHeader className="border-b border-slate-100" onDoubleClick={handleDoubleClick}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="nodrag flex-1 text-sm font-semibold bg-transparent border-0 outline-none ring-1 ring-inset ring-indigo-300 rounded px-1 py-0.5 text-slate-900 focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <BaseNodeHeaderTitle>
            {data.label || 'Simple Node'}
          </BaseNodeHeaderTitle>
        )}
      </BaseNodeHeader>

      {data.description && (
        <BaseNodeContent>
          <p className="text-xs text-slate-500 leading-relaxed">
            {data.description}
          </p>
        </BaseNodeContent>
      )}

      {data.hasChildren && data.onDrillDown && (
        <button
          type="button"
          aria-label="Open sub-canvas"
          className="nodrag absolute -top-3 -left-3 p-0.5 rounded-full bg-white shadow ring-1 ring-slate-200 text-slate-400 opacity-80 hover:opacity-100 hover:text-indigo-600 transition-all cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            data.onDrillDown!(id);
          }}
        >
          <Layers size={14} />
        </button>
      )}

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
    </BaseNode>
  );
}

export default memo(SimpleNode);
