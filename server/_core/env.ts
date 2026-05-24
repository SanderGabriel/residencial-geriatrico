import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().or(z.string().startsWith('mysql://')).optional(),
  JWT_SECRET: z.string().min(8).optional(),
  VITE_MOCK_OAUTH: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  OAUTH_SERVER_URL: z.string().url().optional(),
  OWNER_OPEN_ID: z.string().optional(),
  OWNER_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Configuração de ambiente inválida — verifique seu .env');
}

export const env: Env = parsed.data;
