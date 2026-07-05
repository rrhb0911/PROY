'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProjectListItem from '@/components/ProjectListItem'
import ProjectDetailPanel from '@/components/ProjectDetailPanel'
import ProjectForm from '@/components/ProjectForm'
import { getProjects, createProject, getCategories } from '@/lib/db'
import type { Project, ProjectCategory } from '@/lib/types'

function ProjectsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null

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

  function selectProject(id: number) {
    router.replace(`/projects?id=${id}`, { scroll: false })
  }

  async function handleSave(data: Partial<Project>) {
    try {
      const project = await createProject(data)
      setProjects((prev) => [project, ...prev])
      setShowForm(false)
      selectProject(project.id)
    } catch (err) {
      console.error('Error creating project:', err)
    }
  }

  function handleUpdated(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
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

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Cargando proyectos...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>No hay proyectos todavía.</p>
          <p className="text-sm mt-1">Crea tu primer proyecto para empezar.</p>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="w-80 flex-shrink-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
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
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
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
            <div className="max-h-[70vh] overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">Ningún proyecto en esta categoría.</p>
              ) : (
                filteredProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    selected={project.id === selectedId}
                    onClick={() => selectProject(project.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {selectedId ? (
              <ProjectDetailPanel projectId={selectedId} onUpdated={handleUpdated} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                Selecciona un proyecto de la lista para ver el detalle.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>}>
      <ProjectsPageInner />
    </Suspense>
  )
}
