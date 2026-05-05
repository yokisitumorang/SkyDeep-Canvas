'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PanelRightClose,
  PanelRightOpen,
  Type,
  Move,
  Maximize2,
  Palette,
  Tag,
  FileText,
  Cpu,
  Layers,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import type { ReactFlowNode } from '@/store/diagram-store';
import type { ArchitectureElement } from '@/types/c4';

/** Available node color options matching node-colors.ts */
const NODE_COLORS = [
  { key: 'blue', label: 'Blue', swatch: 'bg-blue-400' },
  { key: 'green', label: 'Green', swatch: 'bg-green-400' },
  { key: 'purple', label: 'Purple', swatch: 'bg-purple-400' },
  { key: 'red', label: 'Red', swatch: 'bg-red-400' },
  { key: 'amber', label: 'Amber', swatch: 'bg-amber-400' },
  { key: 'cyan', label: 'Cyan', swatch: 'bg-cyan-400' },
  { key: 'pink', label: 'Pink', swatch: 'bg-pink-400' },
  { key: 'slate', label: 'Slate', swatch: 'bg-slate-400' },
] as const;

const FONT_OPTIONS = [
  { key: 'virgil' as const, label: 'Virgil (Hand-drawn)' },
  { key: 'default' as const, label: 'System (Sans-serif)' },
];

const TEXT_FONT_OPTIONS = [
  { key: 'virgil', label: 'Virgil (Hand-drawn)' },
  { key: 'default', label: 'Sans-serif' },
  { key: 'serif', label: 'Serif' },
  { key: 'mono', label: 'Monospace' },
];

/** Preset text colors */
const TEXT_COLORS = [
  { key: '#1e293b', label: 'Dark', swatch: 'bg-slate-800' },
  { key: '#475569', label: 'Gray', swatch: 'bg-slate-600' },
  { key: '#94a3b8', label: 'Light', swatch: 'bg-slate-400' },
  { key: '#dc2626', label: 'Red', swatch: 'bg-red-600' },
  { key: '#2563eb', label: 'Blue', swatch: 'bg-blue-600' },
  { key: '#16a34a', label: 'Green', swatch: 'bg-green-600' },
  { key: '#9333ea', label: 'Purple', swatch: 'bg-purple-600' },
  { key: '#ea580c', label: 'Orange', swatch: 'bg-orange-600' },
] as const;

const TYPE_LABELS: Record<string, string> = {
  system: 'System',
  container: 'Container',
  component: 'Component',
  code: 'Code',
  group: 'Group',
  simple: 'Simple',
  text: 'Text',
};

export interface TextNodeStyle {
  fontSize?: number;
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontFamily?: string;
}

export interface PropertiesPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedNode: ReactFlowNode | null;
  element: ArchitectureElement | null;
  onUpdateElement: (id: string, updates: Partial<ArchitectureElement>) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onUpdateNodeSize: (id: string, width: number, height: number) => void;
  onUpdateNodeColor: (id: string, color: string | undefined) => void;
  onUpdateNodeFont: (id: string, font: 'default' | 'virgil') => void;
  onUpdateNodeData: (id: string, data: Record<string, unknown>) => void;
}

/** Debounced text input that commits on blur or Enter */
function PropertyInput({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setDraft(value);
      prevValue.current = value;
    }
  }, [value]);

  const commit = useCallback(() => {
    if (draft !== value) {
      onChange(draft);
      prevValue.current = draft;
    }
  }, [draft, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        commit();
        (e.target as HTMLElement).blur();
      }
      if (e.key === 'Escape') {
        setDraft(value);
        (e.target as HTMLElement).blur();
      }
    },
    [commit, value, multiline],
  );

  const inputClasses =
    'nodrag text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 bg-white';

  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className={`${inputClasses} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
    </div>
  );
}

/** Numeric input with immediate commit */
function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setDraft(String(Math.round(value)));
      prevValue.current = value;
    }
  }, [value]);

  const commit = useCallback(() => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num !== Math.round(value)) {
      onChange(Math.round(num));
      prevValue.current = Math.round(num);
    }
  }, [draft, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commit();
        (e.target as HTMLElement).blur();
      }
      if (e.key === 'Escape') {
        setDraft(String(Math.round(value)));
        (e.target as HTMLElement).blur();
      }
    },
    [commit, value],
  );

  return (
    <div className="flex-1 min-w-0">
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        step={step}
        min={min}
        className="nodrag text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

/** Toggle button for toolbar-style controls */
function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-300'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function PropertiesPanel({
  isOpen,
  onToggle,
  selectedNode,
  element,
  onUpdateElement,
  onUpdateNodePosition,
  onUpdateNodeSize,
  onUpdateNodeColor,
  onUpdateNodeFont,
  onUpdateNodeData,
}: PropertiesPanelProps) {
  const nodeType = selectedNode?.type ?? '';
  const isC4Node = ['system', 'container', 'component', 'code'].includes(nodeType);
  const isGroupNode = nodeType === 'group';
  const isSimpleNode = nodeType === 'simple';
  const isTextNode = nodeType === 'text';

  const nodeWidth = (selectedNode?.style?.width as number) ?? 250;
  const nodeHeight = (selectedNode?.style?.height as number) ?? 150;
  const currentColor = (selectedNode?.data?.customColor as string) ?? undefined;
  const currentFont = (selectedNode?.data?.font as 'default' | 'virgil') ?? 'virgil';

  // Text node specific data
  const textFontSize = (selectedNode?.data?.fontSize as number) ?? 14;
  const textColor = (selectedNode?.data?.textColor as string) ?? '#1e293b';
  const textFontWeight = (selectedNode?.data?.fontWeight as string) ?? 'normal';
  const textFontStyle = (selectedNode?.data?.fontStyle as string) ?? 'normal';
  const textAlign = (selectedNode?.data?.textAlign as string) ?? 'left';
  const textFontFamily = (selectedNode?.data?.fontFamily as string) ?? 'virgil';

  // Section divider
  const SectionDivider = () => <div className="border-t border-slate-200" />;

  // Section header
  const SectionHeader = ({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) => (
    <p className="px-4 text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
      <Icon className="h-3 w-3" />
      {label}
    </p>
  );

  return (
    <aside
      className={`flex-shrink-0 h-full bg-white border-l border-slate-200 flex flex-col transition-[width] duration-200 ease-in-out overflow-hidden ${
        isOpen ? 'w-64' : 'w-10'
      }`}
    >
      {/* Header with toggle */}
      <div
        className={`flex items-center border-b border-slate-200 flex-shrink-0 ${
          isOpen ? 'justify-between px-3 py-3' : 'justify-center py-3'
        }`}
      >
        {isOpen && (
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Properties
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label={isOpen ? 'Collapse properties' : 'Expand properties'}
          title={isOpen ? 'Collapse properties' : 'Expand properties'}
        >
          {isOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>

      {/* Content — only when open */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto">
          {!selectedNode ? (
            <div className="flex items-center justify-center h-full px-4">
              <p className="text-sm text-slate-400 text-center">
                Select a node to view its properties
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              {/* Node type badge */}
              <div className="px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-md ring-1 ring-inset ring-slate-200 bg-slate-50 text-slate-600">
                    {TYPE_LABELS[nodeType] ?? nodeType}
                  </span>
                  <span className="text-xs text-slate-400 font-mono truncate" title={selectedNode.id}>
                    {selectedNode.id.length > 12
                      ? `${selectedNode.id.slice(0, 12)}…`
                      : selectedNode.id}
                  </span>
                </div>
              </div>

              <SectionDivider />

              {/* Identity section — Name, Description, Technology */}
              {!isTextNode && (
                <>
                  <SectionHeader icon={Tag} label="Identity" />
                  <div className="flex flex-col gap-3 px-4">
                    {(isC4Node || isGroupNode) && element && (
                      <PropertyInput
                        label="Name"
                        value={element.name}
                        onChange={(val) => onUpdateElement(element.id, { name: val })}
                        icon={Tag}
                        placeholder="Node name"
                      />
                    )}
                    {isSimpleNode && element && (
                      <PropertyInput
                        label="Label"
                        value={element.name}
                        onChange={(val) => onUpdateElement(element.id, { name: val })}
                        icon={Tag}
                        placeholder="Node label"
                      />
                    )}
                    {isC4Node && element && (
                      <>
                        <PropertyInput
                          label="Description"
                          value={element.description}
                          onChange={(val) => onUpdateElement(element.id, { description: val })}
                          icon={FileText}
                          placeholder="Description"
                          multiline
                        />
                        <PropertyInput
                          label="Technology"
                          value={element.technology ?? ''}
                          onChange={(val) => onUpdateElement(element.id, { technology: val || undefined })}
                          icon={Cpu}
                          placeholder="e.g. React, PostgreSQL"
                        />
                      </>
                    )}
                  </div>
                  <SectionDivider />
                </>
              )}

              {/* Text content section — for text nodes */}
              {isTextNode && element && (
                <>
                  <SectionHeader icon={Type} label="Text" />
                  <div className="flex flex-col gap-3 px-4">
                    <PropertyInput
                      label="Content"
                      value={selectedNode.data.text as string ?? element.name}
                      onChange={(val) => {
                        onUpdateElement(element.id, { name: val });
                        onUpdateNodeData(selectedNode.id, { text: val });
                      }}
                      icon={FileText}
                      placeholder="Enter text…"
                      multiline
                    />
                  </div>
                  <SectionDivider />

                  {/* Text formatting */}
                  <SectionHeader icon={Type} label="Formatting" />
                  <div className="flex flex-col gap-3 px-4">
                    {/* Font size */}
                    <div className="flex gap-3">
                      <NumberInput
                        label="Font Size"
                        value={textFontSize}
                        onChange={(val) => onUpdateNodeData(selectedNode.id, { fontSize: val })}
                        min={8}
                        step={1}
                      />
                    </div>

                    {/* Bold / Italic toggles */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1.5 block">Style</label>
                      <div className="flex gap-1">
                        <ToggleButton
                          active={textFontWeight === 'bold'}
                          onClick={() =>
                            onUpdateNodeData(selectedNode.id, {
                              fontWeight: textFontWeight === 'bold' ? 'normal' : 'bold',
                            })
                          }
                          title="Bold"
                        >
                          <Bold className="h-4 w-4" />
                        </ToggleButton>
                        <ToggleButton
                          active={textFontStyle === 'italic'}
                          onClick={() =>
                            onUpdateNodeData(selectedNode.id, {
                              fontStyle: textFontStyle === 'italic' ? 'normal' : 'italic',
                            })
                          }
                          title="Italic"
                        >
                          <Italic className="h-4 w-4" />
                        </ToggleButton>
                      </div>
                    </div>

                    {/* Text alignment */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1.5 block">Alignment</label>
                      <div className="flex gap-1">
                        <ToggleButton
                          active={textAlign === 'left'}
                          onClick={() => onUpdateNodeData(selectedNode.id, { textAlign: 'left' })}
                          title="Align left"
                        >
                          <AlignLeft className="h-4 w-4" />
                        </ToggleButton>
                        <ToggleButton
                          active={textAlign === 'center'}
                          onClick={() => onUpdateNodeData(selectedNode.id, { textAlign: 'center' })}
                          title="Align center"
                        >
                          <AlignCenter className="h-4 w-4" />
                        </ToggleButton>
                        <ToggleButton
                          active={textAlign === 'right'}
                          onClick={() => onUpdateNodeData(selectedNode.id, { textAlign: 'right' })}
                          title="Align right"
                        >
                          <AlignRight className="h-4 w-4" />
                        </ToggleButton>
                        <ToggleButton
                          active={textAlign === 'justify'}
                          onClick={() => onUpdateNodeData(selectedNode.id, { textAlign: 'justify' })}
                          title="Justify"
                        >
                          <AlignJustify className="h-4 w-4" />
                        </ToggleButton>
                      </div>
                    </div>

                    {/* Font family */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <Type className="h-3 w-3" />
                        Font
                      </label>
                      <select
                        value={textFontFamily}
                        onChange={(e) => onUpdateNodeData(selectedNode.id, { fontFamily: e.target.value })}
                        className="nodrag text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 bg-white"
                      >
                        {TEXT_FONT_OPTIONS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Text color */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Text Color</label>
                      <div className="flex flex-wrap gap-2">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => onUpdateNodeData(selectedNode.id, { textColor: c.key })}
                            className={`w-6 h-6 rounded-full ${c.swatch} transition-all ${
                              textColor === c.key
                                ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                                : 'ring-1 ring-inset ring-black/10 hover:scale-110'
                            }`}
                            title={c.label}
                            aria-label={`Set text color to ${c.label}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <SectionDivider />
                </>
              )}

              {/* Position section */}
              <SectionHeader icon={Move} label="Position" />
              <div className="flex gap-3 px-4">
                <NumberInput
                  label="X"
                  value={selectedNode.position.x}
                  onChange={(x) => onUpdateNodePosition(selectedNode.id, x, selectedNode.position.y)}
                />
                <NumberInput
                  label="Y"
                  value={selectedNode.position.y}
                  onChange={(y) => onUpdateNodePosition(selectedNode.id, selectedNode.position.x, y)}
                />
              </div>

              <SectionDivider />

              {/* Size section */}
              <SectionHeader icon={Maximize2} label="Size" />
              <div className="flex gap-3 px-4">
                <NumberInput
                  label="W"
                  value={nodeWidth}
                  onChange={(w) => onUpdateNodeSize(selectedNode.id, w, nodeHeight)}
                  min={isTextNode ? 60 : 100}
                />
                <NumberInput
                  label="H"
                  value={nodeHeight}
                  onChange={(h) => onUpdateNodeSize(selectedNode.id, nodeWidth, h)}
                  min={isTextNode ? 30 : 50}
                />
              </div>

              {/* Appearance section — only for non-text nodes */}
              {!isTextNode && (
                <>
                  <SectionDivider />
                  <SectionHeader icon={Palette} label="Appearance" />
                  <div className="flex flex-col gap-3 px-4">
                    {/* Color picker */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {NODE_COLORS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() =>
                              onUpdateNodeColor(
                                selectedNode.id,
                                currentColor === c.key ? undefined : c.key,
                              )
                            }
                            className={`w-6 h-6 rounded-full ${c.swatch} transition-all ${
                              currentColor === c.key
                                ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                                : 'ring-1 ring-inset ring-black/10 hover:scale-110'
                            }`}
                            title={c.label}
                            aria-label={`Set color to ${c.label}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Font selector */}
                    {(isC4Node || isSimpleNode) && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                          <Type className="h-3 w-3" />
                          Font
                        </label>
                        <select
                          value={currentFont}
                          onChange={(e) =>
                            onUpdateNodeFont(
                              selectedNode.id,
                              e.target.value as 'default' | 'virgil',
                            )
                          }
                          className="nodrag text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 bg-white"
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Node hierarchy info */}
              {element?.parentId && (
                <>
                  <SectionDivider />
                  <SectionHeader icon={Layers} label="Hierarchy" />
                  <div className="px-4">
                    <p className="text-xs text-slate-500">
                      Parent: <span className="font-mono text-slate-700">{element.parentId}</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
