'use client'

import { useState, useEffect } from 'react'
import { getProjects, getStats } from '@/lib/db'
import ProjectCard from '@/components/ProjectCard'
import type { Project } from '@/lib/types'

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, completed: 0, avgProgress: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProjects(), getStats()])
      .then(([projects, stats]) => {
        setProjects(projects)
        setStats(stats)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel General</h1>
        <p className="text-sm text-gray-500">Resumen del estado de todos tus proyectos</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Proyectos Activos" value={String(stats.active)} color="text-green-600" />
          <StatCard label="En Pausa" value={String(stats.paused)} color="text-yellow-600" />
          <StatCard label="Completados" value={String(stats.completed)} color="text-blue-600" />
          <StatCard label="Progreso Promedio" value={`${stats.avgProgress}%`} color="text-gray-600" />
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Proyectos Recientes</h2>
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            Cargando...
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>No hay proyectos todavía.</p>
            <p className="text-sm mt-1">Crea tu primer proyecto en la sección Proyectos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
