'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface TextNodeData {
  text?: string;
  fontSize?: number;
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontFamily?: 'virgil' | 'default' | 'serif' | 'mono';
  onTextChange?: (newText: string) => void;
  [key: string]: unknown;
}

/** Maps fontFamily keys to CSS font-family values */
function getFontFamilyCSS(fontFamily?: string): string {
  switch (fontFamily) {
    case 'default':
      return 'var(--font-geist-sans), system-ui, sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'mono':
      return 'var(--font-geist-mono), ui-monospace, monospace';
    case 'virgil':
    default:
      return "'Virgil', system-ui, sans-serif";
  }
}

function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text || 'Text');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fontSize = data.fontSize ?? 14;
  const textColor = data.textColor ?? '#1e293b'; // slate-800
  const fontWeight = data.fontWeight ?? 'normal';
  const fontStyle = data.fontStyle ?? 'normal';
  const textAlign = data.textAlign ?? 'left';
  const fontFamily = getFontFamilyCSS(data.fontFamily);

  // Sync draft when data.text changes externally (e.g. from properties panel)
  useEffect(() => {
    if (!editing) {
      setDraft(data.text || 'Text');
    }
  }, [data.text, editing]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    const finalText = trimmed || 'Text';
    setDraft(finalText);
    if (data.onTextChange) {
      data.onTextChange(finalText);
    }
  }, [draft, data]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(data.text || 'Text');
        setEditing(false);
      }
      // Allow Enter for newlines — commit on blur only
    },
    [data.text],
  );

  return (
    <div
      className={`relative w-full h-full ${
        selected ? 'ring-2 ring-indigo-400' : ''
      }`}
      style={{ minWidth: 60, minHeight: 30 }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={60}
        minHeight={30}
        lineClassName="!border-indigo-400"
        handleClassName="!bg-indigo-500 !w-2.5 !h-2.5 !border-white !border-2 !rounded-sm"
      />

      {/* Connection handles */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="nodrag nowheel w-full h-full bg-white/80 border-0 outline-none ring-2 ring-inset ring-indigo-300 rounded px-2 py-1 resize-none focus:ring-indigo-500"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight,
            fontStyle,
            textAlign,
            fontFamily,
            lineHeight: 1.5,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
          }}
        />
      ) : (
        <div
          className="w-full h-full px-2 py-1 select-none"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight,
            fontStyle,
            textAlign,
            fontFamily,
            lineHeight: 1.5,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          {data.text || 'Text'}
        </div>
      )}

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !border-2 !border-white !bg-slate-400" />
    </div>
  );
}

export default memo(TextNode);
