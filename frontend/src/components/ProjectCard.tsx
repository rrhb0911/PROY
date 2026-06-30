import type { Project } from '@/lib/types'
import StatusBadge from './StatusBadge'
import Thermometer from './Thermometer'

interface Props {
  project: Project
}

const priorityColors: Record<string, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-yellow-500',
  critical: 'border-l-red-500',
}

export default function ProjectCard({ project }: Props) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${priorityColors[project.priority]} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
      )}
      <Thermometer progress={project.progress} size="sm" />
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        {project.client_name && <span>{project.client_name}</span>}
        {project.target_date && <span>Meta: {project.target_date}</span>}
      </div>
    </div>
  )
}
