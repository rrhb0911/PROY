interface Props {
  progress: number
  size?: 'sm' | 'md' | 'lg'
}

export default function Thermometer({ progress, size = 'md' }: Props) {
  const clamped = Math.min(100, Math.max(0, progress))
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  let barColor = 'bg-green-500'
  if (clamped < 25) barColor = 'bg-red-500'
  else if (clamped < 50) barColor = 'bg-yellow-500'
  else if (clamped < 75) barColor = 'bg-blue-500'

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${heights[size]} ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{clamped}%</span>
    </div>
  )
}
