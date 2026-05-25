import { describe, expect, it } from 'vitest';
import { calcularFaixa, diasAteVencimento } from './AgendaVencimentos';

describe('diasAteVencimento', () => {
  it('positivo quando vencimento > hoje', () => {
    expect(diasAteVencimento('2026-05-30', '2026-05-23')).toBe(7);
  });
  it('zero quando igual', () => {
    expect(diasAteVencimento('2026-05-23', '2026-05-23')).toBe(0);
  });
  it('negativo quando vencimento < hoje', () => {
    expect(diasAteVencimento('2026-05-20', '2026-05-23')).toBe(-3);
  });
  it('atravessa meses corretamente', () => {
    expect(diasAteVencimento('2026-06-02', '2026-05-30')).toBe(3);
  });
  it('atravessa anos', () => {
    expect(diasAteVencimento('2027-01-01', '2026-12-30')).toBe(2);
  });
});

describe('calcularFaixa', () => {
  it('< hoje => vencidos', () => {
    expect(calcularFaixa('2026-05-20', '2026-05-23')).toBe('vencidos');
  });
  it('hoje => proximos7', () => {
    expect(calcularFaixa('2026-05-23', '2026-05-23')).toBe('proximos7');
  });
  it('+7 dias => proximos7', () => {
    expect(calcularFaixa('2026-05-30', '2026-05-23')).toBe('proximos7');
  });
  it('+8 dias => proximos30', () => {
    expect(calcularFaixa('2026-05-31', '2026-05-23')).toBe('proximos30');
  });
  it('+30 dias => proximos30', () => {
    expect(calcularFaixa('2026-06-22', '2026-05-23')).toBe('proximos30');
  });
  it('+31 dias => futuros', () => {
    expect(calcularFaixa('2026-06-23', '2026-05-23')).toBe('futuros');
  });
});
