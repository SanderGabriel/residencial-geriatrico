import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { trpc } from '@/lib/trpc';
import { formatBRL, formatDate } from '@/lib/format';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export function HomePage() {
  const movsQ = trpc.movimentacoes.list.useQuery({ pagination: { page: 1, pageSize: 5 } });

  const items = movsQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Início</h1>
        <p className="text-slate-500">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/nova-saida">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <ArrowDownCircle size={20} /> Nova saída
              </CardTitle>
              <CardDescription>Registrar despesa com rateio por categoria</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/nova-entrada">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <ArrowUpCircle size={20} /> Nova entrada
              </CardTitle>
              <CardDescription>Registrar receita com rateio por categoria</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas movimentações</CardTitle>
          <CardDescription>5 mais recentes</CardDescription>
        </CardHeader>
        <CardContent>
          {movsQ.isLoading ? (
            <p className="text-slate-500 text-sm">Carregando…</p>
          ) : movsQ.isError ? (
            <p className="text-red-600 text-sm">Erro ao carregar: {movsQ.error.message}</p>
          ) : items.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma movimentação ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">
                      {m.tipo === 'Entrada' ? '↑' : '↓'} {m.descricao ?? '(sem descrição)'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(m.dataCaixa)} · {m.competencia}
                    </div>
                  </div>
                  <div
                    className={
                      m.tipo === 'Entrada'
                        ? 'text-green-700 font-semibold'
                        : 'text-red-700 font-semibold'
                    }
                  >
                    {formatBRL(m.valorTotal)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
