'use client';

import { useState } from 'react';
import type { C4Type, C4Level } from '@/types/c4';

export interface CreateElementFormData {
  name: string;
  type: C4Type;
  description: string;
  technology?: string;
  parentId?: string;
}

export interface CreateElementFormProps {
  onSubmit: (data: CreateElementFormData) => Promise<void>;
  onCancel: () => void;
  currentLevel: C4Level;
  parentId?: string;
}

/**
 * Validates the required fields of the element creation form.
 * Returns an object with `valid` boolean and `errors` record mapping field names to error messages.
 */
export function validateCreateElementForm(data: {
  name: string;
  type: string;
  description: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.type.trim()) {
    errors.type = 'Type is required';
  }

  if (!data.description.trim()) {
    errors.description = 'Description is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

const c4TypeOptions: { value: C4Type; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'container', label: 'Container' },
  { value: 'component', label: 'Component' },
  { value: 'code', label: 'Code' },
];

export default function CreateElementForm({
  onSubmit,
  onCancel,
  parentId,
}: CreateElementFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [technology, setTechnology] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateCreateElementForm({ name, type, description });
    setErrors(validation.errors);

    if (!validation.valid) {
      return;
    }

    setSubmitting(true);
    try {
      const formData: CreateElementFormData = {
        name: name.trim(),
        type: type as C4Type,
        description: description.trim(),
        ...(technology.trim() ? { technology: technology.trim() } : {}),
        ...(parentId ? { parentId } : {}),
      };
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-6">
        <label htmlFor="element-name" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Name
        </label>
        <input
          id="element-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          placeholder="e.g. Payment Service"
        />
        {errors.name && (
          <span className="text-xs text-red-600 mt-2 font-medium block">{errors.name}</span>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="element-type" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Type
        </label>
        <select
          id="element-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={submitting}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        >
          <option value="">Select a type…</option>
          {c4TypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <span className="text-xs text-red-600 mt-2 font-medium block">{errors.type}</span>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="element-description" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Description
        </label>
        <textarea
          id="element-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={3}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          placeholder="Describe the element's purpose"
        />
        {errors.description && (
          <span className="text-xs text-red-600 mt-2 font-medium block">{errors.description}</span>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="element-technology" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Technology
          <span className="text-slate-500 font-normal ml-1">(optional)</span>
        </label>
        <input
          id="element-technology"
          type="text"
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          disabled={submitting}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          placeholder="e.g. Node.js / Express"
        />
      </div>

      <div className="mt-12 border-t border-slate-200 pt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-sm font-semibold text-slate-700 px-3 py-2 hover:bg-slate-100 rounded-md bg-transparent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="text-sm font-semibold text-white px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}
