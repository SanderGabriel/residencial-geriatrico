/**
 * Cálculo de rateios proporcionais com desconto e frete (Phase 1).
 *
 * Regra: dado uma movimentação com valor_total, desconto e frete, e N rateios
 * com valor_bruto cada, distribuir desconto e frete proporcionalmente ao peso
 * de cada rateio em relação ao total.
 *
 *   proporção_i = valor_bruto_i / valor_total
 *   desconto_rateado_i  = desconto * proporção_i
 *   frete_rateado_i     = frete    * proporção_i
 *   valor_liquido_i     = valor_bruto_i - desconto_rateado_i + frete_rateado_i
 *
 * Arredondamento: 2 casas decimais. Para garantir que SUM(desconto_rateado) ==
 * desconto exatamente (em centavos), o último rateio absorve o residual.
 */

export interface RateioInput {
  categoriaId: number;
  valorBruto: number;
}

export interface RateioCalculado extends RateioInput {
  descontoRateado: number;
  freteRateado: number;
  valorLiquidoFinal: number;
}

export interface CalcularRateiosArgs {
  valorTotal: number;
  desconto: number;
  frete: number;
  rateios: RateioInput[];
}

/** Tolerância em reais (R$ 0,01) para comparações de soma de rateios. */
export const TOLERANCIA_CENTAVO = 0.01;

/** Arredonda valor monetário para 2 casas decimais usando half-away-from-zero. */
export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Verifica que a soma dos valores brutos bate com o valor total
 * (tolerância de R$ 0,01).
 */
export function validarSomaRateios(valorTotal: number, rateios: RateioInput[]): boolean {
  if (rateios.length === 0) return false;
  const soma = rateios.reduce((acc, r) => acc + r.valorBruto, 0);
  return Math.abs(soma - valorTotal) <= TOLERANCIA_CENTAVO;
}

/**
 * Distribui desconto e frete proporcionalmente entre os rateios.
 * O último rateio absorve o residual de arredondamento.
 */
export function calcularRateiosComDesconto(args: CalcularRateiosArgs): RateioCalculado[] {
  const { valorTotal, desconto, frete, rateios } = args;

  if (rateios.length === 0) {
    throw new Error('Lista de rateios vazia.');
  }
  if (valorTotal <= 0) {
    throw new Error('valor_total deve ser > 0.');
  }
  if (!validarSomaRateios(valorTotal, rateios)) {
    const soma = rateios.reduce((acc, r) => acc + r.valorBruto, 0);
    throw new Error(
      `Soma dos rateios (${soma.toFixed(2)}) não bate com valor_total (${valorTotal.toFixed(2)}).`,
    );
  }
  if (desconto < 0 || frete < 0) {
    throw new Error('Desconto e frete devem ser ≥ 0.');
  }

  const resultado: RateioCalculado[] = [];
  let descontoAcumulado = 0;
  let freteAcumulado = 0;

  for (let i = 0; i < rateios.length; i++) {
    const r = rateios[i];
    const isUltimo = i === rateios.length - 1;

    let descontoR: number;
    let freteR: number;

    if (isUltimo) {
      // Último rateio absorve o residual para garantir soma exata.
      descontoR = arredondar(desconto - descontoAcumulado);
      freteR = arredondar(frete - freteAcumulado);
    } else {
      const proporcao = r.valorBruto / valorTotal;
      descontoR = arredondar(desconto * proporcao);
      freteR = arredondar(frete * proporcao);
      descontoAcumulado += descontoR;
      freteAcumulado += freteR;
    }

    const valorLiquido = arredondar(r.valorBruto - descontoR + freteR);

    resultado.push({
      categoriaId: r.categoriaId,
      valorBruto: r.valorBruto,
      descontoRateado: descontoR,
      freteRateado: freteR,
      valorLiquidoFinal: valorLiquido,
    });
  }

  return resultado;
}

/** Calcula o valor líquido da movimentação: valor_total - desconto + frete. */
export function calcularValorLiquido(valorTotal: number, desconto: number, frete: number): number {
  return arredondar(valorTotal - desconto + frete);
}
