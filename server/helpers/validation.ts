import { z } from 'zod';

/** ID positivo (auto-increment). */
export const idSchema = z.coerce.number().int().positive();

/** Decimal monetário em BRL (até 2 casas). Aceita number ou string. */
export const decimalSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .refine((v) => Number.isFinite(v), { message: 'Valor inválido' })
  .refine((v) => Math.round(v * 100) === v * 100 || Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
    message: 'Valor com mais de 2 casas decimais',
  });

/** Decimal monetário ≥ 0 (para descontos/fretes/etc). */
export const decimalNonNegSchema = decimalSchema.refine((v) => v >= 0, {
  message: 'Valor deve ser ≥ 0',
});

/** Decimal monetário > 0 (para valor_total, valor_pagamento). */
export const decimalPosSchema = decimalSchema.refine((v) => v > 0, {
  message: 'Valor deve ser > 0',
});

/** Competência no formato MM/AAAA (ex: "04/2026"). */
export const competenciaSchema = z
  .string()
  .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Competência deve estar no formato MM/AAAA');

/** Data no formato YYYY-MM-DD (modo string para evitar problemas de timezone). */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine(
    (s) => {
      const d = new Date(`${s}T12:00:00Z`);
      return !Number.isNaN(d.getTime());
    },
    { message: 'Data inválida' },
  );

/** Pagination input. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type Pagination = z.infer<typeof paginationSchema>;
