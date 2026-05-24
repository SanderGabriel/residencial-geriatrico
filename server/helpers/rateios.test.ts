import { describe, expect, it } from 'vitest';
import {
  arredondar,
  calcularRateiosComDesconto,
  calcularValorLiquido,
  validarSomaRateios,
} from './rateios';

describe('arredondar', () => {
  it('arredonda para 2 casas decimais', () => {
    expect(arredondar(1.234)).toBe(1.23);
    expect(arredondar(1.235)).toBe(1.24);
    expect(arredondar(1.005)).toBeCloseTo(1.0, 2); // float quirk → 1
    expect(arredondar(0)).toBe(0);
  });
});

describe('validarSomaRateios', () => {
  it('aceita soma exata', () => {
    expect(
      validarSomaRateios(100, [
        { categoriaId: 1, valorBruto: 60 },
        { categoriaId: 2, valorBruto: 40 },
      ]),
    ).toBe(true);
  });

  it('aceita diferença ≤ R$ 0,01 (tolerância)', () => {
    expect(
      validarSomaRateios(100, [
        { categoriaId: 1, valorBruto: 60.005 },
        { categoriaId: 2, valorBruto: 39.99 },
      ]),
    ).toBe(true);
  });

  it('rejeita soma divergente', () => {
    expect(
      validarSomaRateios(100, [
        { categoriaId: 1, valorBruto: 50 },
        { categoriaId: 2, valorBruto: 30 },
      ]),
    ).toBe(false);
  });

  it('rejeita lista vazia', () => {
    expect(validarSomaRateios(100, [])).toBe(false);
  });
});

describe('calcularRateiosComDesconto', () => {
  it('caso simples sem desconto nem frete', () => {
    const r = calcularRateiosComDesconto({
      valorTotal: 100,
      desconto: 0,
      frete: 0,
      rateios: [
        { categoriaId: 1, valorBruto: 60 },
        { categoriaId: 2, valorBruto: 40 },
      ],
    });
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      categoriaId: 1,
      valorBruto: 60,
      descontoRateado: 0,
      freteRateado: 0,
      valorLiquidoFinal: 60,
    });
    expect(r[1]).toEqual({
      categoriaId: 2,
      valorBruto: 40,
      descontoRateado: 0,
      freteRateado: 0,
      valorLiquidoFinal: 40,
    });
  });

  it('distribui desconto proporcionalmente', () => {
    const r = calcularRateiosComDesconto({
      valorTotal: 100,
      desconto: 10,
      frete: 0,
      rateios: [
        { categoriaId: 1, valorBruto: 60 },
        { categoriaId: 2, valorBruto: 40 },
      ],
    });
    expect(r[0].descontoRateado).toBe(6);
    expect(r[1].descontoRateado).toBe(4);
    expect(r[0].valorLiquidoFinal).toBe(54);
    expect(r[1].valorLiquidoFinal).toBe(36);
  });

  it('distribui frete proporcionalmente', () => {
    const r = calcularRateiosComDesconto({
      valorTotal: 200,
      desconto: 0,
      frete: 20,
      rateios: [
        { categoriaId: 1, valorBruto: 150 },
        { categoriaId: 2, valorBruto: 50 },
      ],
    });
    expect(r[0].freteRateado).toBe(15);
    expect(r[1].freteRateado).toBe(5);
    expect(r[0].valorLiquidoFinal).toBe(165);
    expect(r[1].valorLiquidoFinal).toBe(55);
  });

  it('combina desconto e frete', () => {
    const r = calcularRateiosComDesconto({
      valorTotal: 100,
      desconto: 5,
      frete: 10,
      rateios: [
        { categoriaId: 1, valorBruto: 70 },
        { categoriaId: 2, valorBruto: 30 },
      ],
    });
    expect(r[0].descontoRateado).toBeCloseTo(3.5, 2);
    expect(r[0].freteRateado).toBe(7);
    expect(r[0].valorLiquidoFinal).toBeCloseTo(70 - 3.5 + 7, 2);
    expect(r[1].descontoRateado + r[0].descontoRateado).toBeCloseTo(5, 2);
    expect(r[1].freteRateado + r[0].freteRateado).toBeCloseTo(10, 2);
  });

  it('último rateio absorve residual de arredondamento (soma exata em centavos)', () => {
    // 3 rateios desiguais geram residual: 33.33 + 33.33 + 33.34 = 100
    const r = calcularRateiosComDesconto({
      valorTotal: 100,
      desconto: 10,
      frete: 0,
      rateios: [
        { categoriaId: 1, valorBruto: 33.33 },
        { categoriaId: 2, valorBruto: 33.33 },
        { categoriaId: 3, valorBruto: 33.34 },
      ],
    });
    const somaDesconto = r.reduce((a, x) => a + x.descontoRateado, 0);
    expect(somaDesconto).toBeCloseTo(10, 2);
    // O último absorveu o residual
    expect(r[r.length - 1].descontoRateado).toBeGreaterThanOrEqual(r[0].descontoRateado);
  });

  it('com 1 único rateio, recebe tudo', () => {
    const r = calcularRateiosComDesconto({
      valorTotal: 100,
      desconto: 5,
      frete: 10,
      rateios: [{ categoriaId: 1, valorBruto: 100 }],
    });
    expect(r).toHaveLength(1);
    expect(r[0].descontoRateado).toBe(5);
    expect(r[0].freteRateado).toBe(10);
    expect(r[0].valorLiquidoFinal).toBe(105);
  });

  it('rejeita lista de rateios vazia', () => {
    expect(() =>
      calcularRateiosComDesconto({
        valorTotal: 100,
        desconto: 0,
        frete: 0,
        rateios: [],
      }),
    ).toThrow();
  });

  it('rejeita valor_total ≤ 0', () => {
    expect(() =>
      calcularRateiosComDesconto({
        valorTotal: 0,
        desconto: 0,
        frete: 0,
        rateios: [{ categoriaId: 1, valorBruto: 0 }],
      }),
    ).toThrow();
  });

  it('rejeita soma de rateios divergente', () => {
    expect(() =>
      calcularRateiosComDesconto({
        valorTotal: 100,
        desconto: 0,
        frete: 0,
        rateios: [
          { categoriaId: 1, valorBruto: 50 },
          { categoriaId: 2, valorBruto: 30 },
        ],
      }),
    ).toThrow(/soma/i);
  });

  it('rejeita desconto ou frete negativos', () => {
    expect(() =>
      calcularRateiosComDesconto({
        valorTotal: 100,
        desconto: -5,
        frete: 0,
        rateios: [{ categoriaId: 1, valorBruto: 100 }],
      }),
    ).toThrow();

    expect(() =>
      calcularRateiosComDesconto({
        valorTotal: 100,
        desconto: 0,
        frete: -5,
        rateios: [{ categoriaId: 1, valorBruto: 100 }],
      }),
    ).toThrow();
  });
});

describe('calcularValorLiquido', () => {
  it('valor_total - desconto + frete', () => {
    expect(calcularValorLiquido(100, 5, 10)).toBe(105);
    expect(calcularValorLiquido(100, 0, 0)).toBe(100);
    expect(calcularValorLiquido(100, 100, 0)).toBe(0);
  });
});
