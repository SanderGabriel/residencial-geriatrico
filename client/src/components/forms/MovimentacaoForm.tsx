import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SaidaRateio, rateiosFechado, type RateioRow } from './SaidaRateio';
import { competenciaAtual, hojeISO } from '@/lib/format';
import { trpc } from '@/lib/trpc';

type Tipo = 'Entrada' | 'Saída';

interface Props {
  tipo: Tipo;
  /** Se presente, modo edição: carrega valores do servidor e usa update mutation. */
  movimentacaoId?: number;
}

export function MovimentacaoForm({ tipo, movimentacaoId }: Props) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const isEdit = movimentacaoId !== undefined;

  const unidadesQ = trpc.unidades.list.useQuery();
  const formasQ = trpc.formasPagamento.list.useQuery();
  const fornecedoresQ = trpc.fornecedores.list.useQuery();
  const categoriasQ = trpc.categorias.list.useQuery();
  const linhasQ = trpc.linhasMargem.list.useQuery();
  const movQ = trpc.movimentacoes.get.useQuery(
    { id: movimentacaoId ?? 0 },
    { enabled: isEdit },
  );

  const [unidadeId, setUnidadeId] = useState<string>('');
  const [dataCaixa, setDataCaixa] = useState<string>(hojeISO());
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [valorTotal, setValorTotal] = useState<string>('');
  const [desconto, setDesconto] = useState<string>('');
  const [frete, setFrete] = useState<string>('');
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>('');
  const [fornecedorId, setFornecedorId] = useState<string>('');
  const [pagador, setPagador] = useState<string>('');
  const [beneficiario, setBeneficiario] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [linhaMargemId, setLinhaMargemId] = useState<string>('');
  const [rateios, setRateios] = useState<RateioRow[]>([]);
  const [hidratado, setHidratado] = useState(false);

  // Hidrata o form quando dados de edição chegarem.
  useEffect(() => {
    if (!isEdit || hidratado || !movQ.data) return;
    const m = movQ.data;
    setUnidadeId(String(m.unidadeId));
    setDataCaixa(typeof m.dataCaixa === 'string' ? m.dataCaixa.slice(0, 10) : hojeISO());
    setCompetencia(m.competencia);
    setValorTotal(String(Number(m.valorTotal)));
    setDesconto(Number(m.desconto) ? String(Number(m.desconto)) : '');
    setFrete(Number(m.frete) ? String(Number(m.frete)) : '');
    setFormaPagamentoId(m.formaPagamentoId ? String(m.formaPagamentoId) : '');
    setFornecedorId(m.fornecedorId ? String(m.fornecedorId) : '');
    setPagador(m.pagador ?? '');
    setBeneficiario(m.beneficiario ?? '');
    setDescricao(m.descricao ?? '');
    setLinhaMargemId(m.linhaMargemId ? String(m.linhaMargemId) : '');
    setRateios(
      m.rateios.map((r) => ({
        categoriaId: r.categoriaId,
        categoriaNome: r.categoriaNome ?? '(?)',
        valor: Number(r.valorBruto),
      })),
    );
    setHidratado(true);
  }, [isEdit, hidratado, movQ.data]);

  const valorTotalNum = useMemo(() => parseFloat(valorTotal) || 0, [valorTotal]);
  const descontoNum = useMemo(() => parseFloat(desconto) || 0, [desconto]);
  const freteNum = useMemo(() => parseFloat(frete) || 0, [frete]);

  const createMut = trpc.movimentacoes.create.useMutation({
    onSuccess: () => {
      toast.success(`${tipo === 'Entrada' ? 'Entrada' : 'Saída'} registrada.`);
      utils.movimentacoes.list.invalidate();
      navigate('/extrato');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.movimentacoes.update.useMutation({
    onSuccess: () => {
      toast.success('Movimentação atualizada.');
      utils.movimentacoes.list.invalidate();
      if (movimentacaoId) utils.movimentacoes.get.invalidate({ id: movimentacaoId });
      navigate('/extrato');
    },
    onError: (e) => toast.error(e.message),
  });

  const mut = isEdit ? updateMut : createMut;

  const submitDisabled =
    !unidadeId ||
    valorTotalNum <= 0 ||
    !rateiosFechado(rateios, valorTotalNum) ||
    mut.isPending ||
    (isEdit && !hidratado);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    const ratesPayload = rateios.map((r) => ({ categoriaId: r.categoriaId, valor: r.valor }));

    if (isEdit && movimentacaoId) {
      updateMut.mutate({
        id: movimentacaoId,
        dataCaixa,
        competencia,
        valorTotal: valorTotalNum,
        desconto: descontoNum,
        frete: freteNum,
        formaPagamentoId: formaPagamentoId ? Number(formaPagamentoId) : null,
        fornecedorId: fornecedorId ? Number(fornecedorId) : null,
        pagador: tipo === 'Entrada' ? pagador || null : null,
        beneficiario: tipo === 'Saída' ? beneficiario || null : null,
        descricao: descricao || null,
        linhaMargemId: linhaMargemId ? Number(linhaMargemId) : null,
        rateios: ratesPayload,
      });
    } else {
      createMut.mutate({
        tipo,
        unidadeId: Number(unidadeId),
        dataCaixa,
        competencia,
        valorTotal: valorTotalNum,
        desconto: descontoNum,
        frete: freteNum,
        formaPagamentoId: formaPagamentoId ? Number(formaPagamentoId) : null,
        fornecedorId: fornecedorId ? Number(fornecedorId) : null,
        pagador: tipo === 'Entrada' ? pagador || null : null,
        beneficiario: tipo === 'Saída' ? beneficiario || null : null,
        descricao: descricao || null,
        linhaMargemId: linhaMargemId ? Number(linhaMargemId) : null,
        rateios: ratesPayload,
      });
    }
  }

  if (isEdit && movQ.isLoading) {
    return <div className="text-sm text-slate-500">Carregando movimentação…</div>;
  }
  if (isEdit && movQ.isError) {
    return <div className="text-sm text-red-600">Erro: {movQ.error.message}</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? `Editar ${tipo === 'Entrada' ? 'entrada' : 'saída'}` : `Dados da ${tipo === 'Entrada' ? 'entrada' : 'saída'}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label required>Unidade</Label>
            <Select
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              required
              disabled={isEdit /* não permite trocar unidade depois de criada */}
            >
              <option value="">Selecione…</option>
              {unidadesQ.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Data</Label>
            <Input
              type="date"
              value={dataCaixa}
              onChange={(e) => setDataCaixa(e.target.value)}
              required
            />
          </div>
          <div>
            <Label required>Competência (MM/AAAA)</Label>
            <Input
              placeholder="04/2026"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              required
            />
          </div>

          <div>
            <Label required>Valor total</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Desconto</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
            />
          </div>
          <div>
            <Label>Frete</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={frete}
              onChange={(e) => setFrete(e.target.value)}
            />
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <Select
              value={formaPagamentoId}
              onChange={(e) => setFormaPagamentoId(e.target.value)}
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
            <Label>{tipo === 'Saída' ? 'Fornecedor' : 'Pagador (origem)'}</Label>
            {tipo === 'Saída' ? (
              <Select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                <option value="">—</option>
                {fornecedoresQ.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            ) : (
              <Input value={pagador} onChange={(e) => setPagador(e.target.value)} />
            )}
          </div>

          <div>
            <Label>Linha de margem</Label>
            <Select value={linhaMargemId} onChange={(e) => setLinhaMargemId(e.target.value)}>
              <option value="">—</option>
              {linhasQ.data?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </div>

          {tipo === 'Saída' && (
            <div className="md:col-span-3">
              <Label>Beneficiário (texto livre)</Label>
              <Input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} />
            </div>
          )}

          <div className="md:col-span-3">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rateio por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <SaidaRateio
            categorias={categoriasQ.data ?? []}
            rateios={rateios}
            onChange={setRateios}
            valorTotal={valorTotalNum}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => navigate('/extrato')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {mut.isPending ? 'Salvando…' : isEdit ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
