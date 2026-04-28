'use client';

import { useState } from 'react';
import type { C4Type, ArchitectureElement } from '@/types/c4';

export interface EditElementFormProps {
  element: ArchitectureElement;
  onSave: (updated: ArchitectureElement) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const c4TypeOptions: { value: C4Type; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'container', label: 'Container' },
  { value: 'component', label: 'Component' },
  { value: 'code', label: 'Code' },
];

export default function EditElementForm({
  element,
  onSave,
  onCancel,
  onDelete,
}: EditElementFormProps) {
  const [name, setName] = useState(element.name);
  const [type, setType] = useState<string>(element.type);
  const [description, setDescription] = useState(element.description);
  const [technology, setTechnology] = useState(element.technology ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!type.trim()) newErrors.type = 'Type is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    onSave({
      ...element,
      name: name.trim(),
      type: type as C4Type,
      description: description.trim(),
      technology: technology.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-6">
        <label htmlFor="edit-name" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Name
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        />
        {errors.name && (
          <span className="text-xs text-red-600 mt-2 font-medium block">{errors.name}</span>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="edit-type" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Type
        </label>
        <select
          id="edit-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        >
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
        <label htmlFor="edit-description" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Description
        </label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        />
        {errors.description && (
          <span className="text-xs text-red-600 mt-2 font-medium block">{errors.description}</span>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="edit-technology" className="text-sm font-medium text-slate-900 leading-6 block mb-1">
          Technology
          <span className="text-slate-500 font-normal ml-1">(optional)</span>
        </label>
        <input
          id="edit-technology"
          type="text"
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          className="text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4 flex items-center">
        <button
          type="button"
          onClick={() => onDelete(element.id)}
          className="text-xs font-medium text-red-600 px-2.5 py-1.5 hover:bg-red-50 rounded-md transition-colors"
        >
          Delete
        </button>

        <div className="ml-auto flex gap-3">
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
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
