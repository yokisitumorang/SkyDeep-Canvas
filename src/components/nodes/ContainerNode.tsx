'use client';

import { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';
import type { C4NodeData } from '@/types/c4';
import { getNodeColors, getNodeFontStyle } from './node-colors';

function ContainerNode({ id, data, selected }: NodeProps<C4NodeData>) {
  const c = getNodeColors('container', data.customColor);

  return (
    <div
      style={getNodeFontStyle(data.font)}
      className={`relative min-w-[200px] h-full rounded-lg border-2 border-dashed ${c.ring.replace('ring-', 'border-')} ${c.bg} p-4 shadow-sm transition-shadow ${
        selected ? `ring-2 ${c.ringSelected} shadow-md` : `ring-1 ring-inset ${c.ring}`
      } ${data.hasChildren ? 'cursor-pointer' : 'opacity-60'}`}
      onDoubleClick={() => data.onEdit(id)}
    >
      <NodeResizer isVisible={!!selected} minWidth={200} minHeight={80}
        lineClassName={c.resizerLine} handleClassName={c.resizerHandle} />

      <Handle type="target" position={Position.Top} id="top-target" className={c.handle} />
      <Handle type="source" position={Position.Top} id="top-source" className={c.handle} />
      <Handle type="target" position={Position.Left} id="left-target" className={c.handle} />
      <Handle type="source" position={Position.Left} id="left-source" className={c.handle} />

      <div className="flex items-start gap-2">
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${c.icon}`} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" /><path d="M12 22.08V12" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-slate-900 truncate">{data.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{data.description}</p>
          {data.technology && (
            <span className={`mt-2 inline-block text-xs font-medium ${c.badge} ${c.badgeBg} px-2 py-1 rounded-md ring-1 ring-inset ${c.badgeRing}`}>
              {data.technology}
            </span>
          )}
        </div>
      </div>

      {data.hasChildren && (
        <button
          type="button"
          aria-label="Open sub-canvas"
          className="nodrag absolute -top-3 -left-3 p-0.5 rounded-full bg-white shadow ring-1 ring-slate-200 text-slate-400 opacity-80 hover:opacity-100 hover:text-indigo-600 transition-all cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            data.onDrillDown(id);
          }}
        >
          <Layers size={14} />
        </button>
      )}

      <Handle type="target" position={Position.Bottom} id="bottom-target" className={c.handle} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={c.handle} />
      <Handle type="target" position={Position.Right} id="right-target" className={c.handle} />
      <Handle type="source" position={Position.Right} id="right-source" className={c.handle} />
    </div>
  );
}

export default memo(ContainerNode);
