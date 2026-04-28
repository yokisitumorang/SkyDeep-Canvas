'use client';

import { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { C4NodeData } from '@/types/c4';
import { getNodeColors } from './node-colors';

function SystemNode({ id, data, selected }: NodeProps<C4NodeData>) {
  const c = getNodeColors('system', data.customColor);

  return (
    <div
      className={`min-w-[200px] h-full rounded-xl ${c.bg} p-4 shadow-sm transition-shadow ${
        selected ? `ring-2 ${c.ringSelected} shadow-md` : `ring-1 ring-inset ${c.ring}`
      } ${data.hasChildren ? 'cursor-pointer' : 'opacity-60'}`}
      onDoubleClick={() => data.onEdit(id)}
    >
      <NodeResizer isVisible={!!selected} minWidth={200} minHeight={80}
        lineClassName={c.resizerLine} handleClassName={c.resizerHandle} />

      <Handle type="target" position={Position.Top} id="top" className={c.handle} />
      <Handle type="target" position={Position.Left} id="left" className={c.handle} />

      <div className="flex items-start gap-2">
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${c.icon}`} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" /><path d="M12 17v4" />
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

      <Handle type="source" position={Position.Bottom} id="bottom" className={c.handle} />
      <Handle type="source" position={Position.Right} id="right" className={c.handle} />
    </div>
  );
}

export default memo(SystemNode);
