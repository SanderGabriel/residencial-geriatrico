import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Label, Select } from '@/components/ui/Input';
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
import { cn } from '@/lib/utils';

type Tab = 'unidades' | 'categorias' | 'fornecedores' | 'formas' | 'linhas';

export function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>('unidades');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-slate-500">Dados-mestres do sistema</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: 'unidades' as const, label: 'Unidades' },
            { id: 'categorias' as const, label: 'Categorias' },
            { id: 'fornecedores' as const, label: 'Fornecedores' },
            { id: 'formas' as const, label: 'Formas de pagamento' },
            { id: 'linhas' as const, label: 'Linhas de margem' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-slate-900 text-slate-900 font-medium'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'unidades' && <UnidadesTab />}
      {tab === 'categorias' && <CategoriasTab />}
      {tab === 'fornecedores' && <FornecedoresTab />}
      {tab === 'formas' && <FormasPagTab />}
      {tab === 'linhas' && <LinhasMargemTab />}
    </div>
  );
}

// ---------- Unidades ----------
function UnidadesTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.unidades.list.useQuery();
  const [confirmNode, askConfirm] = useConfirm();
  const [editing, setEditing] = useState<{ id?: number; nome: string; descricao: string } | null>(
    null,
  );

  const createMut = trpc.unidades.create.useMutation({
    onSuccess: () => {
      toast.success('Unidade criada.');
      utils.unidades.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.unidades.update.useMutation({
    onSuccess: () => {
      toast.success('Unidade atualizada.');
      utils.unidades.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.unidades.delete.useMutation({
    onSuccess: () => {
      toast.success('Unidade removida.');
      utils.unidades.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function salvar() {
    if (!editing) return;
    if (editing.id) {
      updateMut.mutate({ id: editing.id, nome: editing.nome, descricao: editing.descricao || null });
    } else {
      createMut.mutate({ nome: editing.nome, descricao: editing.descricao || null });
    }
  }

  return (
    <>
      {confirmNode}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-3 border-b border-slate-200">
            <Button size="sm" onClick={() => setEditing({ nome: '', descricao: '' })}>
              <Plus size={14} /> Nova unidade
            </Button>
          </div>
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data?.length === 0 ? (
                  <TableEmpty colSpan={3}>
                    Nenhum registro ainda. Clique em <span className="font-medium">Novo</span> acima.
                  </TableEmpty>
                ) : (
                  listQ.data?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-slate-500">{u.descricao ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setEditing({ id: u.id, nome: u.nome, descricao: u.descricao ?? '' })
                            }
                            className="p-1 hover:bg-slate-100 rounded"
                            aria-label="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (await askConfirm({
                                title: 'Confirmar exclusão',
                                description: `Excluir unidade "${u.nome}"?`,
                                destructive: true,
                                confirmLabel: 'Excluir',
                              })) deleteMut.mutate({ id: u.id })
                            }}
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar unidade' : 'Nova unidade'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={!editing?.nome || createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <Label required>Nome</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={editing.descricao}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

// ---------- Categorias ----------
type Natureza = 'Receita' | 'Custo' | 'Despesa' | 'Imposto' | 'Investimento' | 'Não Operacional';

function CategoriasTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.categorias.list.useQuery();
  const [confirmNode, askConfirm] = useConfirm();
  const [editing, setEditing] = useState<
    | { id?: number; nome: string; grupo: string; natureza: Natureza }
    | null
  >(null);

  const createMut = trpc.categorias.create.useMutation({
    onSuccess: () => {
      toast.success('Categoria criada.');
      utils.categorias.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.categorias.update.useMutation({
    onSuccess: () => {
      toast.success('Categoria atualizada.');
      utils.categorias.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.categorias.delete.useMutation({
    onSuccess: () => {
      toast.success('Categoria removida.');
      utils.categorias.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function salvar() {
    if (!editing) return;
    if (editing.id) {
      updateMut.mutate({
        id: editing.id,
        nome: editing.nome,
        grupo: editing.grupo,
        natureza: editing.natureza,
      });
    } else {
      createMut.mutate({
        nome: editing.nome,
        grupo: editing.grupo,
        natureza: editing.natureza,
      });
    }
  }

  return (
    <>
      {confirmNode}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-3 border-b border-slate-200">
            <Button
              size="sm"
              onClick={() => setEditing({ nome: '', grupo: '', natureza: 'Despesa' })}
            >
              <Plus size={14} /> Nova categoria
            </Button>
          </div>
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data?.length === 0 ? (
                  <TableEmpty colSpan={4}>
                    Nenhum registro ainda. Clique em <span className="font-medium">Novo</span> acima.
                  </TableEmpty>
                ) : (
                  listQ.data?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-slate-500">{c.grupo}</TableCell>
                      <TableCell>{c.natureza}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                id: c.id,
                                nome: c.nome,
                                grupo: c.grupo,
                                natureza: c.natureza,
                              })
                            }
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (await askConfirm({
                                title: 'Confirmar exclusão',
                                description: `Excluir categoria "${c.nome}"?`,
                                destructive: true,
                                confirmLabel: 'Excluir',
                              })) deleteMut.mutate({ id: c.id })
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar categoria' : 'Nova categoria'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={
                !editing?.nome ||
                !editing?.grupo ||
                createMut.isPending ||
                updateMut.isPending
              }
            >
              {createMut.isPending || updateMut.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <Label required>Nome</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <Label required>Grupo</Label>
              <Input
                value={editing.grupo}
                placeholder="ex: Receita, Custo Direto…"
                onChange={(e) => setEditing({ ...editing, grupo: e.target.value })}
              />
            </div>
            <div>
              <Label required>Natureza</Label>
              <Select
                value={editing.natureza}
                onChange={(e) =>
                  setEditing({ ...editing, natureza: e.target.value as Natureza })
                }
              >
                <option value="Receita">Receita</option>
                <option value="Custo">Custo</option>
                <option value="Despesa">Despesa</option>
                <option value="Imposto">Imposto</option>
                <option value="Investimento">Investimento</option>
                <option value="Não Operacional">Não Operacional</option>
              </Select>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

// ---------- Fornecedores ----------
function FornecedoresTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.fornecedores.list.useQuery();
  const [confirmNode, askConfirm] = useConfirm();
  const [editing, setEditing] = useState<
    | { id?: number; nome: string; documento: string; telefone: string; email: string }
    | null
  >(null);

  const createMut = trpc.fornecedores.create.useMutation({
    onSuccess: () => {
      toast.success('Fornecedor criado.');
      utils.fornecedores.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.fornecedores.update.useMutation({
    onSuccess: () => {
      toast.success('Fornecedor atualizado.');
      utils.fornecedores.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.fornecedores.delete.useMutation({
    onSuccess: () => {
      toast.success('Fornecedor removido.');
      utils.fornecedores.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function salvar() {
    if (!editing) return;
    const payload = {
      nome: editing.nome,
      documento: editing.documento || undefined,
      telefone: editing.telefone || undefined,
      email: editing.email || undefined,
    };
    if (editing.id) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  }

  return (
    <>
      {confirmNode}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-3 border-b border-slate-200">
            <Button
              size="sm"
              onClick={() =>
                setEditing({ nome: '', documento: '', telefone: '', email: '' })
              }
            >
              <Plus size={14} /> Novo fornecedor
            </Button>
          </div>
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data?.length === 0 ? (
                  <TableEmpty colSpan={5}>
                    Nenhum registro ainda. Clique em <span className="font-medium">Novo</span> acima.
                  </TableEmpty>
                ) : (
                  listQ.data?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell className="text-slate-500">{f.documento ?? '—'}</TableCell>
                      <TableCell className="text-slate-500">{f.telefone ?? '—'}</TableCell>
                      <TableCell className="text-slate-500">{f.email ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                id: f.id,
                                nome: f.nome,
                                documento: f.documento ?? '',
                                telefone: f.telefone ?? '',
                                email: f.email ?? '',
                              })
                            }
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (await askConfirm({
                                title: 'Confirmar exclusão',
                                description: `Excluir fornecedor "${f.nome}"?`,
                                destructive: true,
                                confirmLabel: 'Excluir',
                              })) deleteMut.mutate({ id: f.id })
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar fornecedor' : 'Novo fornecedor'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={!editing?.nome || createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <Label required>Nome</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <Label>Documento (CPF/CNPJ)</Label>
              <Input
                value={editing.documento}
                onChange={(e) => setEditing({ ...editing, documento: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={editing.telefone}
                  onChange={(e) => setEditing({ ...editing, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

// ---------- Formas de pagamento ----------
function FormasPagTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.formasPagamento.list.useQuery();
  const [confirmNode, askConfirm] = useConfirm();
  const [editing, setEditing] = useState<{ id?: number; nome: string } | null>(null);

  const createMut = trpc.formasPagamento.create.useMutation({
    onSuccess: () => { utils.formasPagamento.list.invalidate(); setEditing(null); toast.success('Forma criada.'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.formasPagamento.update.useMutation({
    onSuccess: () => { utils.formasPagamento.list.invalidate(); setEditing(null); toast.success('Forma atualizada.'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.formasPagamento.delete.useMutation({
    onSuccess: () => { utils.formasPagamento.list.invalidate(); toast.success('Forma removida.'); },
    onError: (e) => toast.error(e.message),
  });

  function salvar() {
    if (!editing?.nome) return;
    if (editing.id) updateMut.mutate({ id: editing.id, nome: editing.nome });
    else createMut.mutate({ nome: editing.nome });
  }

  return (
    <>
      {confirmNode}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-3 border-b border-slate-200">
            <Button size="sm" onClick={() => setEditing({ nome: '' })}>
              <Plus size={14} /> Nova forma
            </Button>
          </div>
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data?.length === 0 ? (
                  <TableEmpty colSpan={2}>
                    Nenhum registro ainda. Clique em <span className="font-medium">Novo</span> acima.
                  </TableEmpty>
                ) : (
                  listQ.data?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => setEditing({ id: f.id, nome: f.nome })} className="p-1 hover:bg-slate-100 rounded">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (await askConfirm({
                                title: 'Confirmar exclusão',
                                description: `Excluir "${f.nome}"?`,
                                destructive: true,
                                confirmLabel: 'Excluir',
                              })) deleteMut.mutate({ id: f.id })
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar forma' : 'Nova forma'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!editing?.nome || createMut.isPending || updateMut.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        {editing && (
          <div>
            <Label required>Nome</Label>
            <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
          </div>
        )}
      </Dialog>
    </>
  );
}

// ---------- Linhas de margem ----------
function LinhasMargemTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.linhasMargem.list.useQuery();
  const [confirmNode, askConfirm] = useConfirm();
  const [editing, setEditing] = useState<
    | { id?: number; nome: string; descricao: string; requerNomeCustomizado: boolean }
    | null
  >(null);

  const createMut = trpc.linhasMargem.create.useMutation({
    onSuccess: () => { utils.linhasMargem.list.invalidate(); setEditing(null); toast.success('Linha criada.'); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.linhasMargem.update.useMutation({
    onSuccess: () => { utils.linhasMargem.list.invalidate(); setEditing(null); toast.success('Linha atualizada.'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.linhasMargem.delete.useMutation({
    onSuccess: () => { utils.linhasMargem.list.invalidate(); toast.success('Linha removida.'); },
    onError: (e) => toast.error(e.message),
  });

  function salvar() {
    if (!editing?.nome) return;
    const payload = {
      nome: editing.nome,
      descricao: editing.descricao || null,
      requerNomeCustomizado: editing.requerNomeCustomizado,
    };
    if (editing.id) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  }

  return (
    <>
      {confirmNode}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-3 border-b border-slate-200">
            <Button
              size="sm"
              onClick={() => setEditing({ nome: '', descricao: '', requerNomeCustomizado: false })}
            >
              <Plus size={14} /> Nova linha
            </Button>
          </div>
          {listQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Requer nome customizado</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data?.length === 0 ? (
                  <TableEmpty colSpan={4}>
                    Nenhum registro ainda. Clique em <span className="font-medium">Novo</span> acima.
                  </TableEmpty>
                ) : (
                  listQ.data?.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell className="text-slate-500">{l.descricao ?? '—'}</TableCell>
                      <TableCell>{l.requerNomeCustomizado ? 'Sim' : 'Não'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                id: l.id,
                                nome: l.nome,
                                descricao: l.descricao ?? '',
                                requerNomeCustomizado: l.requerNomeCustomizado,
                              })
                            }
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (await askConfirm({
                                title: 'Confirmar exclusão',
                                description: `Excluir linha "${l.nome}"?`,
                                destructive: true,
                                confirmLabel: 'Excluir',
                              })) deleteMut.mutate({ id: l.id })
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar linha' : 'Nova linha'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!editing?.nome || createMut.isPending || updateMut.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <Label required>Nome</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={editing.descricao}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.requerNomeCustomizado}
                onChange={(e) =>
                  setEditing({ ...editing, requerNomeCustomizado: e.target.checked })
                }
              />
              Requer nome customizado (linha tipo "Outros")
            </label>
          </div>
        )}
      </Dialog>
    </>
  );
}
