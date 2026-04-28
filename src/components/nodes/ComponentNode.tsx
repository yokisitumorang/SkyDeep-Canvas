'use client';

import { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { C4NodeData } from '@/types/c4';
import { getNodeColors, getNodeFontStyle } from './node-colors';

function ComponentNode({ id, data, selected }: NodeProps<C4NodeData>) {
  const c = getNodeColors('component', data.customColor);

  return (
    <div
      style={getNodeFontStyle(data.font)}
      className={`min-w-[200px] h-full rounded-lg border-2 border-solid ${c.ring.replace('ring-', 'border-')} ${c.bg} p-4 shadow-sm transition-shadow ${
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
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4" /><path d="M12 19v4" />
          <path d="M1 12h4" /><path d="M19 12h4" />
          <path d="M4.22 4.22l2.83 2.83" /><path d="M16.95 16.95l2.83 2.83" />
          <path d="M4.22 19.78l2.83-2.83" /><path d="M16.95 7.05l2.83-2.83" />
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

export default memo(ComponentNode);
