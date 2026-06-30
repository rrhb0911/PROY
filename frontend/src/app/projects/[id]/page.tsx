'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getProject, getTasks, updateProject, updateTask, createTask } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import Thermometer from '@/components/Thermometer'
import type { Project, ProjectTask } from '@/lib/types'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    const projectId = Number(id)
    Promise.all([getProject(projectId), getTasks(projectId)])
      .then(([project, tasks]) => {
        setProject(project)
        setTasks(tasks)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const progress = Number(e.target.value)
    if (!project) return
    setProject({ ...project, progress })
    await updateProject(project.id, { progress }).catch(console.error)
  }

  async function handleStatusChange(status: Project['status']) {
    if (!project) return
    setProject({ ...project, status })
    await updateProject(project.id, { status }).catch(console.error)
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !project) return
    const task = await createTask({ project_id: project.id, title: newTaskTitle.trim() })
    setTasks((prev) => [task, ...prev])
    setNewTaskTitle('')
  }

  async function handleToggleTask(task: ProjectTask) {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    })
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus as ProjectTask['status'], completed_at: newStatus === 'done' ? new Date().toISOString() : null }
          : t
      )
    )
  }

  if (loading) {
    return <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Cargando...</div>
  }

  if (!project) {
    return <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Proyecto no encontrado.</div>
  }

  const statuses: Project['status'][] = ['active', 'paused', 'completed', 'cancelled']

  return (
    <div>
      <button onClick={() => router.push('/projects')} className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Volver a Proyectos
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Progreso</label>
          <Thermometer progress={project.progress} size="lg" />
          <input
            type="range"
            min={0}
            max={100}
            value={project.progress}
            onChange={handleProgressChange}
            className="w-full mt-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  project.status === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s === 'active' ? 'Activo' : s === 'paused' ? 'Pausado' : s === 'completed' ? 'Completado' : 'Cancelado'}
              </button>
            ))}
          </div>
        </div>

        {project.url_repo && (
          <p className="text-sm">
            <span className="text-gray-500">Repo:</span>{' '}
            <a href={project.url_repo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {project.url_repo}
            </a>
          </p>
        )}
        {project.url_deploy && (
          <p className="text-sm">
            <span className="text-gray-500">Deploy:</span>{' '}
            <a href={project.url_deploy} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {project.url_deploy}
            </a>
          </p>
        )}
        {project.client_name && <p className="text-sm text-gray-500 mt-1">Cliente: {project.client_name}</p>}
        {project.target_date && <p className="text-sm text-gray-500">Fecha meta: {project.target_date}</p>}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tareas</h2>

        <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Nueva tarea..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Agregar
          </button>
        </form>

        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay tareas todavía.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => handleToggleTask(task)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span
                  className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}
                >
                  {task.title}
                </span>
                <StatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
