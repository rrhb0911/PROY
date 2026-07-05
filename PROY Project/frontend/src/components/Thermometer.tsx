interface Props {
  progress: number
  size?: 'sm' | 'md' | 'lg'
}

export function progressColor(progress: number): string {
  const clamped = Math.min(100, Math.max(0, progress))
  const hue = clamped * 1.2 // 0 = rojo, 120 = verde
  return `hsl(${hue}, 70%, 45%)`
}

export default function Thermometer({ progress, size = 'md' }: Props) {
  const clamped = Math.min(100, Math.max(0, progress))
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%`, backgroundColor: progressColor(clamped) }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{clamped}%</span>
    </div>
  )
}
