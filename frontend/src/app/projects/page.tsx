'use client'

import { useState } from 'react'
import ProjectCard from '@/components/ProjectCard'
import ProjectForm from '@/components/ProjectForm'
import type { Project } from '@/lib/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)

  function handleSave(data: Partial<Project>) {
    const project: Project = {
      id: Date.now(),
      name: data.name || '',
      description: data.description || null,
      category_id: null,
      status: data.status || 'active',
      progress: data.progress || 0,
      priority: data.priority || 'medium',
      client_name: data.client_name || null,
      budget: null,
      start_date: null,
      target_date: data.target_date || null,
      url_repo: data.url_repo || null,
      url_deploy: data.url_deploy || null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProjects((prev) => [...prev, project])
    setShowForm(false)
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500">Gestiona todos tus proyectos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Proyecto'}
        </button>
      </header>

      {showForm && (
        <div className="mb-6">
          <ProjectForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>No hay proyectos todavía.</p>
          <p className="text-sm mt-1">Crea tu primer proyecto para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
