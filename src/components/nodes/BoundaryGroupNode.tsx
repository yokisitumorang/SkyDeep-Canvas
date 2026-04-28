'use client';

import { memo } from 'react';
import type { NodeProps } from 'reactflow';

interface BoundaryGroupData {
  label: string;
}

function BoundaryGroupNode({ data }: NodeProps<BoundaryGroupData>) {
  return (
    <div className="h-full w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {data.label}
      </p>
    </div>
  );
}

export default memo(BoundaryGroupNode);
