import { describe, expect, it } from 'vitest';
import { competenciaAtual, formatBRL, formatDate, hojeISO, parseBRL } from './format';

describe('formatBRL', () => {
  it('formata números em BRL', () => {
    expect(formatBRL(1234.56)).toMatch(/R\$\s*1\.234,56/);
    expect(formatBRL(0)).toMatch(/R\$\s*0,00/);
    expect(formatBRL(0.5)).toMatch(/R\$\s*0,50/);
  });

  it('aceita string numérica', () => {
    expect(formatBRL('1234.56')).toMatch(/1\.234,56/);
  });

  it('null/undefined/string vazia => R$ 0,00', () => {
    expect(formatBRL(null)).toMatch(/0,00/);
    expect(formatBRL(undefined)).toMatch(/0,00/);
    expect(formatBRL('')).toMatch(/0,00/);
  });

  it('NaN/Infinity tratados como 0', () => {
    expect(formatBRL(NaN)).toMatch(/0,00/);
    expect(formatBRL(Infinity)).toMatch(/0,00/);
  });
});

describe('formatDate', () => {
  it('YYYY-MM-DD => DD/MM/AAAA, sem shift de timezone', () => {
    expect(formatDate('2026-05-15')).toBe('15/05/2026');
    expect(formatDate('2026-01-01')).toBe('01/01/2026');
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
  });

  it('Date object => DD/MM/AAAA', () => {
    const d = new Date(2026, 4, 15); // local time
    expect(formatDate(d)).toBe('15/05/2026');
  });

  it('vazio/null/undefined => string vazia', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('YYYY-MM-DDTHH:mm:ss extrai só a parte da data', () => {
    expect(formatDate('2026-05-15T18:30:00Z')).toBe('15/05/2026');
  });
});

describe('parseBRL', () => {
  it('passa número direto', () => {
    expect(parseBRL(123.45)).toBe(123.45);
  });

  it('parseia formato BRL "1.234,56"', () => {
    expect(parseBRL('1.234,56')).toBe(1234.56);
    expect(parseBRL('1234,56')).toBe(1234.56);
    expect(parseBRL('1.234.567,89')).toBe(1234567.89);
  });

  it('parseia formato simples "1234.56"', () => {
    expect(parseBRL('1234.56')).toBe(1234.56);
  });

  it('string com R$ é limpa', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(1234.56);
  });

  it('string inválida => 0', () => {
    expect(parseBRL('abc')).toBe(0);
    expect(parseBRL('')).toBe(0);
  });
});

describe('competenciaAtual', () => {
  it('formato MM/AAAA', () => {
    const c = competenciaAtual(new Date(2026, 3, 15)); // abril 2026
    expect(c).toBe('04/2026');
  });
});

describe('hojeISO', () => {
  it('formato YYYY-MM-DD em timezone local', () => {
    const d = new Date(2026, 4, 15); // maio 15
    expect(hojeISO(d)).toBe('2026-05-15');
  });
});
