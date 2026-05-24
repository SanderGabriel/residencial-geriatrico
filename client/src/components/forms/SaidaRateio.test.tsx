import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaidaRateio, rateiosFechado, type RateioRow } from './SaidaRateio';

const categorias = [
  { id: 1, nome: 'Hospedagem', grupo: 'Receita' },
  { id: 2, nome: 'Fraldas (custo)', grupo: 'Custo Direto' },
  { id: 3, nome: 'Luz', grupo: 'Utilidades' },
];

describe('rateiosFechado', () => {
  it('lista vazia => false', () => {
    expect(rateiosFechado([], 100)).toBe(false);
  });

  it('soma exata => true', () => {
    expect(
      rateiosFechado(
        [
          { categoriaId: 1, categoriaNome: 'X', valor: 60 },
          { categoriaId: 2, categoriaNome: 'Y', valor: 40 },
        ],
        100,
      ),
    ).toBe(true);
  });

  it('diferença ≤ R$ 0,01 => true', () => {
    expect(
      rateiosFechado(
        [{ categoriaId: 1, categoriaNome: 'X', valor: 99.999 }],
        100,
      ),
    ).toBe(true);
  });

  it('soma divergente => false', () => {
    expect(
      rateiosFechado(
        [{ categoriaId: 1, categoriaNome: 'X', valor: 50 }],
        100,
      ),
    ).toBe(false);
  });
});

describe('<SaidaRateio>', () => {
  it('mostra mensagem quando vazio', () => {
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    expect(screen.getByText(/busque e adicione categorias/i)).toBeInTheDocument();
  });

  it('busca filtra categorias por nome', async () => {
    const user = userEvent.setup();
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    const input = screen.getByPlaceholderText(/buscar categoria/i);
    await user.type(input, 'frald');
    expect(screen.getByText('Fraldas (custo)')).toBeInTheDocument();
    expect(screen.queryByText('Hospedagem')).not.toBeInTheDocument();
  });

  it('busca também filtra por grupo', async () => {
    const user = userEvent.setup();
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    const input = screen.getByPlaceholderText(/buscar categoria/i);
    await user.type(input, 'Receita');
    expect(screen.getByText('Hospedagem')).toBeInTheDocument();
    expect(screen.queryByText('Luz')).not.toBeInTheDocument();
  });

  it('clicar em sugestão chama onChange com novo rateio', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[]}
        onChange={onChange}
        valorTotal={100}
      />,
    );
    const input = screen.getByPlaceholderText(/buscar categoria/i);
    await user.type(input, 'luz');
    await user.click(screen.getByText('Luz'));
    expect(onChange).toHaveBeenCalledWith([
      { categoriaId: 3, categoriaNome: 'Luz', valor: 0 },
    ]);
  });

  it('categoria já adicionada não aparece na busca', async () => {
    const user = userEvent.setup();
    const rateios: RateioRow[] = [{ categoriaId: 3, categoriaNome: 'Luz', valor: 50 }];
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={rateios}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    const input = screen.getByPlaceholderText(/buscar categoria/i);
    await user.type(input, 'luz');
    // "Luz" deve estar na tabela (uma vez), não nas sugestões (i.e. só 1 ocorrência)
    expect(screen.getAllByText('Luz')).toHaveLength(1);
  });

  it('mostra "Falta" quando soma < total', () => {
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[{ categoriaId: 1, categoriaNome: 'X', valor: 60 }]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    expect(screen.getByText(/falta/i)).toBeInTheDocument();
  });

  it('mostra "Excesso" quando soma > total', () => {
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[{ categoriaId: 1, categoriaNome: 'X', valor: 150 }]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    expect(screen.getByText(/excesso/i)).toBeInTheDocument();
  });

  it('não mostra aviso quando soma == total', () => {
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[{ categoriaId: 1, categoriaNome: 'X', valor: 100 }]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    expect(screen.queryByText(/falta|excesso/i)).not.toBeInTheDocument();
  });

  it('alterar valor no input chama onChange', () => {
    const onChange = vi.fn();
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[{ categoriaId: 1, categoriaNome: 'X', valor: 0 }]}
        onChange={onChange}
        valorTotal={100}
      />,
    );
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith([{ categoriaId: 1, categoriaNome: 'X', valor: 75 }]);
  });

  it('botão remover chama onChange com lista filtrada', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[
          { categoriaId: 1, categoriaNome: 'A', valor: 50 },
          { categoriaId: 2, categoriaNome: 'B', valor: 50 },
        ]}
        onChange={onChange}
        valorTotal={100}
      />,
    );
    const removerBtns = screen.getAllByLabelText(/remover/i);
    await user.click(removerBtns[0]);
    expect(onChange).toHaveBeenCalledWith([{ categoriaId: 2, categoriaNome: 'B', valor: 50 }]);
  });

  it('botão "auto" preenche o último rateio com o residual', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[
          { categoriaId: 1, categoriaNome: 'A', valor: 60 },
          { categoriaId: 2, categoriaNome: 'B', valor: 0 },
        ]}
        onChange={onChange}
        valorTotal={100}
      />,
    );
    await user.click(screen.getByTitle(/preencher último rateio/i));
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[1].valor).toBe(40);
  });

  it('busca vazia não mostra sugestões', () => {
    render(
      <SaidaRateio
        categorias={categorias}
        rateios={[]}
        onChange={() => {}}
        valorTotal={100}
      />,
    );
    expect(screen.queryByText('Hospedagem')).not.toBeInTheDocument();
  });
});
