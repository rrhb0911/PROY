'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'

interface Props {
  onSave: (project: Partial<Project>) => void
  onCancel: () => void
}

export default function ProjectForm({ onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active' as Project['status'],
    priority: 'medium' as Project['priority'],
    progress: 0,
    client_name: '',
    target_date: '',
    url_repo: '',
    url_deploy: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'progress' ? Number(value) : value }))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold">Nuevo Proyecto</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select name="status" value={form.status} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select name="priority" value={form.priority} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Progreso (%)</label>
        <input
          type="range"
          name="progress"
          min={0}
          max={100}
          value={form.progress}
          onChange={handleChange}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{form.progress}%</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <input type="text" name="client_name" value={form.client_name} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Meta</label>
          <input type="date" name="target_date" value={form.target_date} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Repo URL</label>
          <input type="url" name="url_repo" value={form.url_repo} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deploy URL</label>
          <input type="url" name="url_deploy" value={form.url_deploy} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Guardar
        </button>
      </div>
    </form>
  )
}
