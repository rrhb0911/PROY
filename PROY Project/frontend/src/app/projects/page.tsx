'use client'

import { useState, useEffect } from 'react'
import ProjectCard from '@/components/ProjectCard'
import ProjectForm from '@/components/ProjectForm'
import { getProjects, createProject, getCategories } from '@/lib/db'
import type { Project, ProjectCategory } from '@/lib/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<ProjectCategory[]>([])
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    Promise.all([getProjects(), getCategories()])
      .then(([projects, categories]) => {
        setProjects(projects)
        setCategories(categories)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredProjects = categoryFilter
    ? projects.filter((p) => p.category_id === categoryFilter)
    : projects

  async function handleSave(data: Partial<Project>) {
    try {
      const project = await createProject(data)
      setProjects((prev) => [project, ...prev])
      setShowForm(false)
    } catch (err) {
      console.error('Error creating project:', err)
    }
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

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              categoryFilter === null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                categoryFilter === c.id
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              style={categoryFilter === c.id ? { backgroundColor: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Cargando proyectos...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>No hay proyectos {categoryFilter ? 'en esta categoría' : 'todavía'}.</p>
          {!categoryFilter && <p className="text-sm mt-1">Crea tu primer proyecto para empezar.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
