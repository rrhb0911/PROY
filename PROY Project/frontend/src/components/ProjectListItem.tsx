import type { Project } from '@/lib/types'
import StatusBadge from './StatusBadge'
import { progressColor } from './Thermometer'

interface Props {
  project: Project
  selected: boolean
  onClick: () => void
}

export default function ProjectListItem({ project, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 py-2 border-b border-gray-100 transition-colors ${
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {project.category && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.category.color }}
            />
          )}
          <span className="font-medium text-xs text-gray-900 truncate">{project.name}</span>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1">
        <div
          className="h-1 rounded-full"
          style={{ width: `${project.progress}%`, backgroundColor: progressColor(project.progress) }}
        />
      </div>
    </button>
  )
}
