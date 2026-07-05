'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

const links = [
  { href: '/', label: 'Panel', icon: '▦' },
  { href: '/projects', label: 'Proyectos', icon: '📁' },
  { href: '/finanzas', label: 'Finanzas', icon: '💰' },
  { href: '/trading', label: 'Trading', icon: '📈' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()

  if (pathname === '/login') return null

  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen p-4 flex flex-col">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">PROY</h1>
        <p className="text-xs text-gray-500">Termómetro de Proyectos</p>
      </div>

      <nav className="space-y-1 flex-1">
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

      {!loading && user && (
        <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
          <div className="text-sm text-gray-700 truncate">{user.email}</div>
          <button
            onClick={signOut}
            className="w-full text-left text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
