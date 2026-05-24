import { describe, expect, it } from 'vitest';
import {
  competenciaSchema,
  dateStringSchema,
  decimalNonNegSchema,
  decimalPosSchema,
  decimalSchema,
  idSchema,
  paginationSchema,
} from './validation';

describe('idSchema', () => {
  it('aceita inteiro positivo', () => {
    expect(idSchema.parse(1)).toBe(1);
    expect(idSchema.parse('42')).toBe(42);
  });
  it('rejeita zero, negativo e não-inteiro', () => {
    expect(() => idSchema.parse(0)).toThrow();
    expect(() => idSchema.parse(-1)).toThrow();
    expect(() => idSchema.parse(1.5)).toThrow();
  });
});

describe('decimalSchema', () => {
  it('aceita number e string', () => {
    expect(decimalSchema.parse(10.5)).toBe(10.5);
    expect(decimalSchema.parse('10.50')).toBe(10.5);
  });
  it('rejeita NaN/Infinity', () => {
    expect(() => decimalSchema.parse(Infinity)).toThrow();
    expect(() => decimalSchema.parse(NaN)).toThrow();
  });
});

describe('decimalPosSchema', () => {
  it('rejeita ≤ 0', () => {
    expect(() => decimalPosSchema.parse(0)).toThrow();
    expect(() => decimalPosSchema.parse(-1)).toThrow();
  });
  it('aceita > 0', () => {
    expect(decimalPosSchema.parse(0.01)).toBe(0.01);
  });
});

describe('decimalNonNegSchema', () => {
  it('aceita 0', () => {
    expect(decimalNonNegSchema.parse(0)).toBe(0);
  });
  it('rejeita negativo', () => {
    expect(() => decimalNonNegSchema.parse(-0.01)).toThrow();
  });
});

describe('competenciaSchema', () => {
  it('aceita MM/AAAA válido', () => {
    expect(competenciaSchema.parse('04/2026')).toBe('04/2026');
    expect(competenciaSchema.parse('12/2099')).toBe('12/2099');
    expect(competenciaSchema.parse('01/0001')).toBe('01/0001');
  });
  it('rejeita formato inválido', () => {
    expect(() => competenciaSchema.parse('4/2026')).toThrow();
    expect(() => competenciaSchema.parse('13/2026')).toThrow();
    expect(() => competenciaSchema.parse('00/2026')).toThrow();
    expect(() => competenciaSchema.parse('04-2026')).toThrow();
    expect(() => competenciaSchema.parse('2026/04')).toThrow();
  });
});

describe('dateStringSchema', () => {
  it('aceita YYYY-MM-DD válido', () => {
    expect(dateStringSchema.parse('2026-05-23')).toBe('2026-05-23');
  });
  it('rejeita formato inválido', () => {
    expect(() => dateStringSchema.parse('23/05/2026')).toThrow();
    expect(() => dateStringSchema.parse('2026/05/23')).toThrow();
    expect(() => dateStringSchema.parse('2026-5-23')).toThrow();
  });
});

describe('paginationSchema', () => {
  it('default page=1 pageSize=50', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 50 });
  });
  it('respeita override', () => {
    expect(paginationSchema.parse({ page: 3, pageSize: 100 })).toEqual({ page: 3, pageSize: 100 });
  });
  it('rejeita pageSize > 200', () => {
    expect(() => paginationSchema.parse({ pageSize: 201 })).toThrow();
  });
});
