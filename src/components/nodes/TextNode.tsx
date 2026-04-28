'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TextFont } from '@/components/TextContextMenu';

export interface TextNodeData {
  name: string;
  font?: TextFont;
  onTextChange: (nodeId: string, text: string) => void;
  onTextContextMenu: (e: React.MouseEvent, nodeId: string, currentFont: TextFont) => void;
  autoFocus?: boolean;
}

function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const [editing, setEditing] = useState(!!data.autoFocus);
  const [draft, setDraft] = useState(data.name);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fontStyle = data.font === 'virgil'
    ? { fontFamily: 'Virgil, sans-serif' }
    : { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' };

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

  return (
    <div
      className={`min-w-[80px] h-full px-2 py-1 rounded-sm transition-all ${
        selected && !editing ? 'ring-1 ring-dashed ring-slate-400' : ''
      }`}
      onDoubleClick={(e) => startEditing(e)}
      onContextMenu={handleContextMenu}
    >
      <NodeResizer
        isVisible={!!selected && !editing}
        minWidth={80}
        minHeight={32}
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
          rows={4}
          style={fontStyle}
          className="w-full h-full resize-none bg-white/80 rounded text-sm font-medium text-slate-700 leading-relaxed outline-none ring-1 ring-inset ring-slate-300 focus:ring-indigo-400 px-2 py-1 placeholder:text-slate-400"
          placeholder="Type something…"
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <p
          style={fontStyle}
          className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap select-none"
        >
          {data.name || (
            <span className="text-slate-400 italic text-xs">Double-click to edit</span>
          )}
        </p>
      )}
    </div>
  );
}

export default memo(TextNode);
