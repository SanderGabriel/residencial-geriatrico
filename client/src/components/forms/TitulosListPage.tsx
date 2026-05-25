import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { trpc } from '@/lib/trpc';
import { formatBRL, formatDate, competenciaAtual, hojeISO } from '@/lib/format';
import { cn } from '@/lib/utils';

export type StatusTitulo = 'Previsto' | 'Parcial' | 'Pago' | 'Recebido' | 'Atrasado' | 'Cancelado';

export const STATUS_COLOR: Record<StatusTitulo, string> = {
  Previsto: 'bg-blue-100 text-blue-800',
  Parcial: 'bg-amber-100 text-amber-800',
  Pago: 'bg-green-100 text-green-800',
  Recebido: 'bg-green-100 text-green-800',
  Atrasado: 'bg-red-100 text-red-800',
  Cancelado: 'bg-slate-200 text-slate-700',
};

interface PagamentoState {
  tituloId: number;
  descricao: string;
  saldoEmAberto: number;
  valor: string;
  dataCaixa: string;
  competencia: string;
  formaPagamentoId: string;
  categoriaId: string;
}

interface EditState {
  id?: number;
  descricao: string;
  valorTotal: string;
  desconto: string;
  dataVencimento: string;
  competencia: string;
  fornecedorId: string;
  linhaMargemId: string;
}

interface Props {
  tipo: 'Pagar' | 'Receber';
}

export function TitulosListPage({ tipo }: Props) {
  const utils = trpc.useUtils();
  const [statusFiltro, setStatusFiltro] = useState<'' | StatusTitulo>('');
  const [pagamento, setPagamento] = useState<PagamentoState | null>(null);
  const [editando, setEditando] = useState<EditState | null>(null);
  const [confirmNode, askConfirm] = useConfirm();

  const unidadesQ = trpc.unidades.list.useQuery();
  const fornecedoresQ = trpc.fornecedores.list.useQuery();
  const linhasQ = trpc.linhasMargem.list.useQuery();

  const listQ = trpc.titulos.list.useQuery({ tipo, status: statusFiltro || undefined });
  const formasQ = trpc.formasPagamento.list.useQuery();
  const categoriasQ = trpc.categorias.list.useQuery();

  const pagarMut = trpc.titulos.pagar.useMutation({
    onSuccess: () => {
      toast.success(tipo === 'Pagar' ? 'Pagamento registrado.' : 'Recebimento registrado.');
      utils.titulos.list.invalidate();
      utils.movimentacoes.list.invalidate();
      setPagamento(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const createTituloMut = trpc.titulos.create.useMutation({
    onSuccess: () => {
      toast.success('Título criado.');
      utils.titulos.list.invalidate();
      setEditando(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateTituloMut = trpc.titulos.update.useMutation({
    onSuccess: () => {
      toast.success('Título atualizado.');
      utils.titulos.list.invalidate();
      setEditando(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteTituloMut = trpc.titulos.delete.useMutation({
    onSuccess: () => {
      toast.success('Título removido.');
      utils.titulos.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = listQ.data?.items ?? [];

  const labelAcao = tipo === 'Pagar' ? 'Pagar' : 'Receber';
  const labelTitulo = tipo === 'Pagar' ? 'Pagamento' : 'Recebimento';
  const labelStatusFinal = tipo === 'Pagar' ? 'Pago' : 'Recebido';

  function abrirPagamento(t: { id: number; descricao: string; saldoEmAberto: string | null }) {
    const saldo = Number(t.saldoEmAberto ?? 0);
    setPagamento({
      tituloId: t.id,
      descricao: t.descricao,
      saldoEmAberto: saldo,
      valor: saldo.toFixed(2),
      dataCaixa: hojeISO(),
      competencia: competenciaAtual(),
      formaPagamentoId: '',
      categoriaId: '',
    });
  }

  function confirmar() {
    if (!pagamento) return;
    pagarMut.mutate({
      tituloId: pagamento.tituloId,
      valorPagamento: parseFloat(pagamento.valor) || 0,
      dataCaixa: pagamento.dataCaixa,
      competencia: pagamento.competencia,
      formaPagamentoId: pagamento.formaPagamentoId ? Number(pagamento.formaPagamentoId) : null,
      categoriaId: Number(pagamento.categoriaId),
    });
  }

  const podePagar = (status: StatusTitulo) =>
    status !== 'Pago' && status !== 'Recebido' && status !== 'Cancelado';

  // Filtra categorias pela natureza apropriada (receita para Receber, despesa/custo para Pagar)
  const categoriasFiltradas = (categoriasQ.data ?? []).filter((c) =>
    tipo === 'Pagar' ? c.natureza !== 'Receita' : c.natureza === 'Receita',
  );

  function abrirNovo() {
    setEditando({
      descricao: '',
      valorTotal: '',
      desconto: '',
      dataVencimento: hojeISO(),
      competencia: competenciaAtual(),
      fornecedorId: '',
      linhaMargemId: '',
    });
  }

  function abrirEdicao(t: {
    id: number;
    descricao: string;
    valorTotal: string | null;
    desconto: string | null;
    dataVencimento: string;
    competencia: string | null;
    fornecedorId: number | null;
    linhaMargemId: number | null;
  }) {
    setEditando({
      id: t.id,
      descricao: t.descricao,
      valorTotal: String(Number(t.valorTotal ?? 0)),
      desconto: Number(t.desconto) ? String(Number(t.desconto)) : '',
      dataVencimento:
        typeof t.dataVencimento === 'string' ? t.dataVencimento.slice(0, 10) : hojeISO(),
      competencia: t.competencia ?? competenciaAtual(),
      fornecedorId: t.fornecedorId ? String(t.fornecedorId) : '',
      linhaMargemId: t.linhaMargemId ? String(t.linhaMargemId) : '',
    });
  }

  function salvarTitulo() {
    if (!editando) return;
    const valor = parseFloat(editando.valorTotal) || 0;
    const desc = parseFloat(editando.desconto) || 0;
    if (valor <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    if (editando.id) {
      updateTituloMut.mutate({
        id: editando.id,
        descricao: editando.descricao,
        valorTotal: valor,
        desconto: desc,
        dataVencimento: editando.dataVencimento,
        competencia: editando.competencia || null,
        fornecedorId: editando.fornecedorId ? Number(editando.fornecedorId) : null,
        linhaMargemId: editando.linhaMargemId ? Number(editando.linhaMargemId) : null,
      });
    } else {
      const primeiraUnidade = unidadesQ.data?.[0];
      if (!primeiraUnidade) {
        toast.error('Cadastre uma unidade antes de criar título.');
        return;
      }
      createTituloMut.mutate({
        unidadeId: primeiraUnidade.id,
        tipo,
        descricao: editando.descricao,
        valorTotal: valor,
        desconto: desc,
        dataVencimento: editando.dataVencimento,
        competencia: editando.competencia || undefined,
        fornecedorId: editando.fornecedorId ? Number(editando.fornecedorId) : null,
        linhaMargemId: editando.linhaMargemId ? Number(editando.linhaMargemId) : null,
      });
    }
  }

  async function deletar(id: number, descricao: string) {
    const ok = await askConfirm({
      title: 'Excluir título?',
      description: `Excluir "${descricao}"? Movimentações de pagamento já feitas continuam no extrato.`,
      destructive: true,
      confirmLabel: 'Excluir',
    });
    if (ok) deleteTituloMut.mutate({ id });
  }

  return (
    <div className="space-y-4">
      {confirmNode}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Títulos a {tipo === 'Pagar' ? 'pagar' : 'receber'}
          </h1>
          <p className="text-slate-500">
            {tipo === 'Pagar'
              ? 'Compromissos com fornecedores'
              : 'Mensalidades e valores a receber de residentes'}
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={14} /> Novo título
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label>Status</Label>
            <Select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as StatusTitulo | '')}
            >
              <option value="">Todos</option>
              <option value="Previsto">Previsto</option>
              <option value="Parcial">Parcial</option>
              <option value={labelStatusFinal}>{labelStatusFinal}</option>
              <option value="Atrasado">Atrasado</option>
              <option value="Cancelado">Cancelado</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableEmpty colSpan={6}>
                    Nenhum título ainda.{' '}
                    <button onClick={abrirNovo} className="text-slate-900 underline">
                      Criar o primeiro →
                    </button>
                  </TableEmpty>
                ) : (
                  items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-md truncate">{t.descricao}</TableCell>
                      <TableCell>{formatDate(t.dataVencimento)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            STATUS_COLOR[t.status],
                          )}
                        >
                          {t.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatBRL(t.valorTotal)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBRL(t.saldoEmAberto)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {podePagar(t.status) && (
                            <Button size="sm" onClick={() => abrirPagamento(t)}>
                              {labelAcao}
                            </Button>
                          )}
                          <button
                            onClick={() => abrirEdicao(t)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-700"
                            aria-label="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deletar(t.id, t.descricao)}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                            aria-label="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
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

      <Dialog
        open={pagamento !== null}
        onClose={() => setPagamento(null)}
        title={`Registrar ${tipo === 'Pagar' ? 'pagamento' : 'recebimento'}`}
        description={pagamento?.descricao}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPagamento(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmar}
              disabled={
                !pagamento ||
                !pagamento.categoriaId ||
                parseFloat(pagamento.valor) <= 0 ||
                pagarMut.isPending
              }
            >
              {pagarMut.isPending ? 'Salvando…' : 'Confirmar'}
            </Button>
          </>
        }
      >
        {pagamento && (
          <div className="space-y-3">
            <div className="text-sm bg-slate-50 p-3 rounded border border-slate-200">
              Saldo em aberto:{' '}
              <span className="font-semibold">{formatBRL(pagamento.saldoEmAberto)}</span>
            </div>
            <div>
              <Label required>Valor a {labelAcao.toLowerCase()}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={pagamento.saldoEmAberto}
                value={pagamento.valor}
                onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Data</Label>
                <Input
                  type="date"
                  value={pagamento.dataCaixa}
                  onChange={(e) => setPagamento({ ...pagamento, dataCaixa: e.target.value })}
                />
              </div>
              <div>
                <Label required>Competência</Label>
                <Input
                  placeholder="04/2026"
                  value={pagamento.competencia}
                  onChange={(e) => setPagamento({ ...pagamento, competencia: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Forma de {labelTitulo.toLowerCase()}</Label>
              <Select
                value={pagamento.formaPagamentoId}
                onChange={(e) =>
                  setPagamento({ ...pagamento, formaPagamentoId: e.target.value })
                }
              >
                <option value="">—</option>
                {formasQ.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>Categoria contábil</Label>
              <Select
                value={pagamento.categoriaId}
                onChange={(e) => setPagamento({ ...pagamento, categoriaId: e.target.value })}
                required
              >
                <option value="">Selecione…</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grupo} — {c.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando?.id ? 'Editar título' : `Novo título a ${tipo === 'Pagar' ? 'pagar' : 'receber'}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarTitulo}
              disabled={
                !editando?.descricao ||
                !editando?.valorTotal ||
                createTituloMut.isPending ||
                updateTituloMut.isPending
              }
            >
              {createTituloMut.isPending || updateTituloMut.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        {editando && (
          <div className="space-y-3">
            <div>
              <Label required>Descrição</Label>
              <Input
                value={editando.descricao}
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                placeholder={tipo === 'Pagar' ? 'Ex: Aluguel maio' : 'Ex: Mensalidade João'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Valor total</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editando.valorTotal}
                  onChange={(e) => setEditando({ ...editando, valorTotal: e.target.value })}
                />
              </div>
              <div>
                <Label>Desconto</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editando.desconto}
                  onChange={(e) => setEditando({ ...editando, desconto: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Vencimento</Label>
                <Input
                  type="date"
                  value={editando.dataVencimento}
                  onChange={(e) => setEditando({ ...editando, dataVencimento: e.target.value })}
                />
              </div>
              <div>
                <Label>Competência</Label>
                <Input
                  placeholder="04/2026"
                  value={editando.competencia}
                  onChange={(e) => setEditando({ ...editando, competencia: e.target.value })}
                />
              </div>
            </div>
            {tipo === 'Pagar' && (
              <div>
                <Label>Fornecedor</Label>
                <Select
                  value={editando.fornecedorId}
                  onChange={(e) => setEditando({ ...editando, fornecedorId: e.target.value })}
                >
                  <option value="">—</option>
                  {fornecedoresQ.data?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Linha de margem</Label>
              <Select
                value={editando.linhaMargemId}
                onChange={(e) => setEditando({ ...editando, linhaMargemId: e.target.value })}
              >
                <option value="">—</option>
                {linhasQ.data?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
