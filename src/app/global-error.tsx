'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">🚨</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Error Crítico</h1>
            <p className="text-gray-600 mb-6">
              Ha ocurrido un error crítico en la aplicación.
            </p>
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reiniciar aplicación
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
