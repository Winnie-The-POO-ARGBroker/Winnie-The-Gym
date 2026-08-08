import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

function Test() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health/').then((res) => res.data),
    retry: 1,
    refetchInterval: 30000,
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🏋️ Winnie The Gym</h1>
        <p className="text-gray-500 text-sm">Sistema Integral de Gestión de Gimnasios</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 w-full max-w-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Estado del sistema
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-gray-700 font-medium">API Backend</span>
          <div className="ml-auto flex items-center gap-2">
            {isLoading && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-yellow-600 text-sm font-medium">Conectando...</span>
              </>
            )}
            {isError && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-600 text-sm font-medium">Sin conexión</span>
              </>
            )}
            {data && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-600 text-sm font-medium">Online</span>
              </>
            )}
          </div>
        </div>

        {data && (
          <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 font-mono overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}

        {isError && (
          <p className="text-xs text-gray-400 mt-2">
            Asegurate de que el backend esté corriendo en{' '}
            <code className="bg-gray-100 px-1 rounded">localhost:8000</code>
          </p>
        )}
      </div>
    </div>
  )
}

export default Test
