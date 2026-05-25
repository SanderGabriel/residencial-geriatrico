import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { DateInputBR } from '@/components/ui/DateInputBR';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { trpc } from '@/lib/trpc';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Filtros {
  periodoInicio: string;
  periodoFim: string;
  competencia: string;
  unidadeId: string;
}

const FILTROS_INICIAIS: Filtros = {
  periodoInicio: '',
  periodoFim: '',
  competencia: '',
  unidadeId: '',
};

/**
 * Mini-gráfico de barras horizontais usando width-percent. Não traz dependência
 * de charting (recharts deixaria o bundle ~80 KB maior).
 */
function BarHorizontal({
  label,
  valor,
  max,
  cor,
}: {
  label: string;
  valor: number;
  max: number;
  cor: string;
}) {
  const pct = max > 0 ? Math.min(100, (Math.abs(valor) / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[140px_1fr_120px] items-center gap-2 py-1">
      <span className="text-sm text-slate-700 truncate">{label}</span>
      <div className="h-4 bg-slate-100 rounded-sm overflow-hidden">
        <div className={cn('h-full', cor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-right font-mono tabular-nums">{formatBRL(valor)}</span>
    </div>
  );
}

export function RelatorioEconomiaPage() {
  const [draft, setDraft] = useState<Filtros>(FILTROS_INICIAIS);
  const [aplicado, setAplicado] = useState<Filtros>(FILTROS_INICIAIS);

  const filtroQuery = useMemo(
    () => ({
      periodoInicio: aplicado.periodoInicio || undefined,
      periodoFim: aplicado.periodoFim || undefined,
      competencia: aplicado.competencia || undefined,
      unidadeId: aplicado.unidadeId ? Number(aplicado.unidadeId) : undefined,
    }),
    [aplicado],
  );

  const unidadesQ = trpc.unidades.list.useQuery();
  const naturezaQ = trpc.relatorios.porNatureza.useQuery(filtroQuery);
  const linhaQ = trpc.relatorios.porLinhaMargem.useQuery(filtroQuery);
  const unidadeQ = trpc.relatorios.porUnidade.useQuery(filtroQuery);

  const maxNatureza = useMemo(() => {
    if (!naturezaQ.data) return 0;
    return Math.max(0, ...Object.values(naturezaQ.data.totais));
  }, [naturezaQ.data]);

  const maxLinhaEntrada = useMemo(() => {
    if (!linhaQ.data) return 0;
    return Math.max(0, ...linhaQ.data.itens.map((i) => Math.max(i.entrada, i.saida)));
  }, [linhaQ.data]);

  const maxUnidade = useMemo(() => {
    if (!unidadeQ.data) return 0;
    return Math.max(0, ...unidadeQ.data.itens.map((i) => Math.max(i.entrada, i.saida)));
  }, [unidadeQ.data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Relatório de economia</h1>
        <p className="text-slate-500">Margens e resultado por categoria, linha e unidade</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Data início</Label>
              <DateInputBR
                value={draft.periodoInicio}
                onChange={(iso) => setDraft({ ...draft, periodoInicio: iso })}
              />
            </div>
            <div>
              <Label>Data fim</Label>
              <DateInputBR
                value={draft.periodoFim}
                onChange={(iso) => setDraft({ ...draft, periodoFim: iso })}
              />
            </div>
            <div>
              <Label>Competência (MM/AAAA)</Label>
              <Input
                placeholder="04/2026"
                value={draft.competencia}
                onChange={(e) => setDraft({ ...draft, competencia: e.target.value })}
              />
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={draft.unidadeId} onChange={(e) => setDraft({ ...draft, unidadeId: e.target.value })}>
                <option value="">Todas</option>
                {unidadesQ.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => { setDraft(FILTROS_INICIAIS); setAplicado(FILTROS_INICIAIS); }}>
              Limpar
            </Button>
            <Button onClick={() => setAplicado(draft)}>Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Por natureza */}
      <Card>
        <CardHeader>
          <CardTitle>Por natureza (categoria contábil)</CardTitle>
        </CardHeader>
        <CardContent>
          {naturezaQ.isLoading ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : naturezaQ.isError ? (
            <p className="text-sm text-red-600">{naturezaQ.error.message}</p>
          ) : naturezaQ.data ? (
            <div className="space-y-1">
              <BarHorizontal label="Receita" valor={naturezaQ.data.totais['Receita']} max={maxNatureza} cor="bg-green-500" />
              <BarHorizontal label="Custo" valor={naturezaQ.data.totais['Custo']} max={maxNatureza} cor="bg-red-500" />
              <BarHorizontal label="Despesa" valor={naturezaQ.data.totais['Despesa']} max={maxNatureza} cor="bg-orange-500" />
              <BarHorizontal label="Imposto" valor={naturezaQ.data.totais['Imposto']} max={maxNatureza} cor="bg-amber-500" />
              <BarHorizontal label="Investimento" valor={naturezaQ.data.totais['Investimento']} max={maxNatureza} cor="bg-blue-500" />
              <BarHorizontal label="Não operacional" valor={naturezaQ.data.totais['Não Operacional']} max={maxNatureza} cor="bg-slate-500" />
              <div className="border-t border-slate-200 mt-2 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium">Margem (Receita − Custo)</span>
                <span className={cn('text-sm font-semibold', naturezaQ.data.margem >= 0 ? 'text-green-700' : 'text-red-700')}>
                  {formatBRL(naturezaQ.data.margem)} · {naturezaQ.data.margemPct.toFixed(1)}%
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Por linha de margem */}
      <Card>
        <CardHeader>
          <CardTitle>Por linha de margem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {linhaQ.isLoading ? (
            <div className="p-4 text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Visual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhaQ.data?.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-6">
                      Sem dados para o filtro aplicado.
                    </TableCell>
                  </TableRow>
                ) : (
                  linhaQ.data?.itens.map((l) => (
                    <TableRow key={String(l.linhaId)}>
                      <TableCell className="font-medium">{l.linhaNome}</TableCell>
                      <TableCell className="text-right">{formatBRL(l.entrada)}</TableCell>
                      <TableCell className="text-right">{formatBRL(l.saida)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          l.margem >= 0 ? 'text-green-700' : 'text-red-700',
                        )}
                      >
                        {formatBRL(l.margem)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{l.margemPct.toFixed(1)}%</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="h-3 bg-slate-100 rounded-sm overflow-hidden flex">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(l.entrada / (maxLinhaEntrada || 1)) * 100}%` }}
                          />
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${(l.saida / (maxLinhaEntrada || 1)) * 100}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Por unidade */}
      <Card>
        <CardHeader>
          <CardTitle>Por unidade</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {unidadeQ.isLoading ? (
            <div className="p-4 text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Visual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unidadeQ.data?.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-slate-500 py-6">
                      Sem dados.
                    </TableCell>
                  </TableRow>
                ) : (
                  unidadeQ.data?.itens.map((u) => (
                    <TableRow key={u.unidadeId}>
                      <TableCell className="font-medium">{u.unidadeNome}</TableCell>
                      <TableCell className="text-right">{formatBRL(u.entrada)}</TableCell>
                      <TableCell className="text-right">{formatBRL(u.saida)}</TableCell>
                      <TableCell
                        className={cn('text-right font-semibold', u.saldo >= 0 ? 'text-green-700' : 'text-red-700')}
                      >
                        {formatBRL(u.saldo)}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="h-3 bg-slate-100 rounded-sm overflow-hidden flex">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(u.entrada / (maxUnidade || 1)) * 100}%` }}
                          />
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${(u.saida / (maxUnidade || 1)) * 100}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
