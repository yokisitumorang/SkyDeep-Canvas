'use client';

import { useState, useRef, useEffect } from 'react';

interface CreateSubLayerDialogProps {
  /** The parent node name, shown as context in the dialog */
  parentNodeName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export default function CreateSubLayerDialog({
  parentNodeName,
  onSubmit,
  onCancel,
}: CreateSubLayerDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when the dialog opens
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity"
      onKeyDown={handleKeyDown}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-slate-900 leading-tight">
          Create Sub Layer
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          New canvas under <span className="font-medium text-slate-700">{parentNodeName}</span>
        </p>

        <div className="mt-6">
          <label
            htmlFor="sublayer-name"
            className="text-sm font-medium text-slate-900 leading-6 block mb-1"
          >
            Sub Layer Name
          </label>
          <input
            ref={inputRef}
            id="sublayer-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Internal Services"
            className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 placeholder:text-slate-400"
          />
          {error && (
            <span className="text-xs text-red-600 mt-2 font-medium block">
              {error}
            </span>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-slate-700 px-3 py-2 hover:bg-slate-100 rounded-md bg-transparent"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="text-sm font-semibold text-white px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
