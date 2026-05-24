export function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
      <main className="max-w-xl text-center p-8">
        <h1 className="text-3xl font-bold mb-2">Novo Lar Financeiro</h1>
        <p className="text-slate-600 mb-6">
          Sistema financeiro do Grupo Novo Lar — Phase 1 (Foundation)
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-left text-sm space-y-1">
          <p>
            <span className="font-semibold">Status:</span> Foundation pronto (schema + seed +
            skeleton).
          </p>
          <p>
            <span className="font-semibold">Próximo:</span> Parte 2 — routers tRPC (CRUD, rateios,
            títulos, auditoria).
          </p>
          <p>
            <span className="font-semibold">tRPC health:</span>{' '}
            <code className="text-slate-700">GET /api/trpc/health</code>
          </p>
        </div>
      </main>
    </div>
  );
}
