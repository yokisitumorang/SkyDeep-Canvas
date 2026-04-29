'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeResizer, useUpdateNodeInternals } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TextFont } from '@/components/TextContextMenu';

export interface TextNodeData {
  name: string;
  font?: TextFont;
  fontSize?: number;
  onTextChange: (nodeId: string, text: string) => void;
  onFontSizeChange?: (nodeId: string, size: number) => void;
  onTextContextMenu: (e: React.MouseEvent, nodeId: string, currentFont: TextFont) => void;
  autoFocus?: boolean;
}

const BASE_FONT_SIZE = 14; // default text-sm = 14px
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 72;

function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const [editing, setEditing] = useState(!!data.autoFocus);
  const [draft, setDraft] = useState(data.name);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  const fontSize = data.fontSize ?? BASE_FONT_SIZE;

  const fontFamily = data.font === 'virgil'
    ? 'Virgil, sans-serif'
    : 'var(--font-geist-sans), system-ui, sans-serif';

  useEffect(() => {
    if (!editing) setDraft(data.name);
  }, [data.name, editing]);

  useEffect(() => {
    if (data.autoFocus && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [data.autoFocus]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim() || 'Text';
    setDraft(trimmed);
    data.onTextChange(id, trimmed);
  }, [draft, id, data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') { setDraft(data.name); setEditing(false); }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    },
    [commit, data.name]
  );

  const startEditing = useCallback((e?: React.MouseEvent) => {
    setEditing(true);
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      if (e) {
        const doc = document as Document & {
          caretPositionFromPoint?: (x: number, y: number) => { offset: number } | null;
          caretRangeFromPoint?: (x: number, y: number) => Range | null;
        };
        let offset = el.value.length;
        if (doc.caretPositionFromPoint) {
          const pos = doc.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) offset = pos.offset;
        } else if (doc.caretRangeFromPoint) {
          const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) offset = range.startOffset;
        }
        el.setSelectionRange(offset, offset);
      } else {
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    data.onTextContextMenu(e, id, data.font ?? 'virgil');
  }, [data, id]);

  // Track previous dimensions to detect resize drags
  const prevDimsRef = useRef<{ w: number; h: number } | null>(null);

  // Observe container size changes from NodeResizer and scale font accordingly
  useEffect(() => {
    const container = containerRef.current;
    if (!container || editing) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW === 0 || newH === 0) continue;

        const prev = prevDimsRef.current;
        if (!prev) {
          // First observation — just record dimensions
          prevDimsRef.current = { w: newW, h: newH };
          continue;
        }

        // Only scale if the user is actively resizing (selected + dimensions changed meaningfully)
        if (!selected) {
          prevDimsRef.current = { w: newW, h: newH };
          continue;
        }

        const scaleW = newW / prev.w;
        const scaleH = newH / prev.h;
        // Use the smaller scale factor to keep text fitting
        const scale = Math.min(scaleW, scaleH);

        if (Math.abs(scale - 1) > 0.02) {
          const currentSize = data.fontSize ?? BASE_FONT_SIZE;
          const newSize = Math.round(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, currentSize * scale)));
          if (newSize !== currentSize && data.onFontSizeChange) {
            data.onFontSizeChange(id, newSize);
          }
          prevDimsRef.current = { w: newW, h: newH };
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [editing, selected, id, data]);

  // Update node internals when font size changes so handles reposition
  useEffect(() => {
    updateNodeInternals(id);
  }, [fontSize, id, updateNodeInternals]);

  return (
    <div
      ref={containerRef}
      className={`min-w-[40px] min-h-[24px] px-2 py-1 rounded-sm transition-all ${
        selected && !editing ? 'ring-1 ring-dashed ring-slate-400' : ''
      }`}
      style={{ width: 'fit-content', height: 'fit-content' }}
      onDoubleClick={(e) => startEditing(e)}
      onContextMenu={handleContextMenu}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />

      <NodeResizer
        isVisible={!!selected && !editing}
        minWidth={40}
        minHeight={24}
        lineClassName="!border-slate-400"
        handleClassName="!bg-slate-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm"
      />

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={Math.max(2, draft.split('\n').length)}
          style={{ fontFamily, fontSize }}
          className="w-full min-w-[120px] resize-none bg-white/80 rounded font-medium text-slate-700 leading-relaxed outline-none ring-1 ring-inset ring-slate-300 focus:ring-indigo-400 px-2 py-1 placeholder:text-slate-400"
          placeholder="Type something…"
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <p
          ref={textRef}
          style={{ fontFamily, fontSize }}
          className="font-medium text-slate-700 leading-relaxed whitespace-pre-wrap select-none"
        >
          {data.name || (
            <span className="text-slate-400 italic" style={{ fontSize: Math.max(10, fontSize * 0.8) }}>
              Double-click to edit
            </span>
          )}
        </p>
      )}

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
    </div>
  );
}

export default memo(TextNode);
