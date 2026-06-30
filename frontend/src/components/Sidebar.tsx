'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Panel', icon: '▦' },
  { href: '/projects', label: 'Proyectos', icon: '📁' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen p-4">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">PROY</h1>
        <p className="text-xs text-gray-500">Termómetro de Proyectos</p>
      </div>
      <nav className="space-y-1">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
