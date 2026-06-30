export default function Home() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel General</h1>
        <p className="text-sm text-gray-500">Resumen del estado de todos tus proyectos</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Proyectos Activos" value="--" color="text-green-600" />
        <StatCard label="En Pausa" value="--" color="text-yellow-600" />
        <StatCard label="Completados" value="--" color="text-blue-600" />
        <StatCard label="Progreso Promedio" value="--%" color="text-gray-600" />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Proyectos</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>Conecta Supabase para ver tus proyectos.</p>
          <p className="text-sm mt-1">
            Crea un proyecto en{' '}
            <a href="https://supabase.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              supabase.com
            </a>
            {' '}y configura las variables de entorno.
          </p>
        </div>
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
