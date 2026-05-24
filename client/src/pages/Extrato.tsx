import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { trpc } from '@/lib/trpc';
import { formatBRL, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Filtros {
  periodoInicio: string;
  periodoFim: string;
  tipo: '' | 'Entrada' | 'Saída';
  unidadeId: string;
  beneficiario: string;
  competencia: string;
}

const FILTROS_INICIAIS: Filtros = {
  periodoInicio: '',
  periodoFim: '',
  tipo: '',
  unidadeId: '',
  beneficiario: '',
  competencia: '',
};

export function ExtratoPage() {
  const utils = trpc.useUtils();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_INICIAIS);
  const [page, setPage] = useState(1);

  const unidadesQ = trpc.unidades.list.useQuery();

  const listInput = useMemo(
    () => ({
      periodoInicio: aplicado.periodoInicio || undefined,
      periodoFim: aplicado.periodoFim || undefined,
      tipo: aplicado.tipo || undefined,
      unidadeId: aplicado.unidadeId ? Number(aplicado.unidadeId) : undefined,
      beneficiario: aplicado.beneficiario || undefined,
      competencia: aplicado.competencia || undefined,
      pagination: { page, pageSize: 50 },
    }),
    [aplicado, page],
  );

  const listQ = trpc.movimentacoes.list.useQuery(listInput);

  const deleteMut = trpc.movimentacoes.delete.useMutation({
    onSuccess: () => {
      toast.success('Movimentação removida.');
      utils.movimentacoes.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = listQ.data?.items ?? [];

  // Saldo acumulado: itens vêm em ordem desc; calculamos na ordem cronológica e
  // revertemos. (Saldo da página, não saldo global — limitação aceita p/ MVP.)
  const itemsComSaldo = useMemo(() => {
    let saldo = 0;
    const asc = items.slice().reverse();
    const withSaldo = asc.map((m) => {
      const v = Number(m.valorTotal);
      saldo += m.tipo === 'Entrada' ? v : -v;
      return { ...m, saldo };
    });
    return withSaldo.reverse();
  }, [items]);

  function aplicarFiltros() {
    setPage(1);
    setAplicado(filtros);
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
    setAplicado(FILTROS_INICIAIS);
    setPage(1);
  }

  function deletar(id: number) {
    if (!confirm('Confirma exclusão desta movimentação?')) return;
    deleteMut.mutate({ id });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Extrato</h1>
          <p className="text-slate-500">Consulta de movimentações</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Data início</Label>
              <Input
                type="date"
                value={filtros.periodoInicio}
                onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input
                type="date"
                value={filtros.periodoFim}
                onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as Filtros['tipo'] })}
              >
                <option value="">Todos</option>
                <option value="Entrada">Entrada</option>
                <option value="Saída">Saída</option>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select
                value={filtros.unidadeId}
                onChange={(e) => setFiltros({ ...filtros, unidadeId: e.target.value })}
              >
                <option value="">Todas</option>
                {unidadesQ.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Competência (MM/AAAA)</Label>
              <Input
                placeholder="04/2026"
                value={filtros.competencia}
                onChange={(e) => setFiltros({ ...filtros, competencia: e.target.value })}
              />
            </div>
            <div>
              <Label>Beneficiário</Label>
              <Input
                value={filtros.beneficiario}
                onChange={(e) => setFiltros({ ...filtros, beneficiario: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={limparFiltros}>Limpar</Button>
            <Button onClick={aplicarFiltros}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : listQ.isError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Erro ao carregar: {listQ.error.message}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo (página)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsComSaldo.length === 0 ? (
                  <TableEmpty colSpan={7} />
                ) : (
                  itemsComSaldo.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.dataCaixa)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            m.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                          )}
                        >
                          {m.tipo}
                        </span>
                      </TableCell>
                      <TableCell>{m.competencia}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {m.descricao ?? m.beneficiario ?? m.pagador ?? '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          m.tipo === 'Entrada' ? 'text-green-700' : 'text-red-700',
                        )}
                      >
                        {m.tipo === 'Saída' ? '−' : ''}
                        {formatBRL(m.valorTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatBRL(m.saldo)}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => deletar(m.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-600"
                          aria-label="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between p-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Página {page} · {items.length} item(ns)
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={items.length < 50}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
