import { customType } from 'drizzle-orm/mysql-core';

/**
 * Tipo JSON com parse/stringify explícito.
 *
 * Por que existe: o `json()` nativo do Drizzle (MySqlJson) só implementa
 * `mapToDriverValue` (stringify na escrita) mas NÃO `mapFromDriverValue`.
 * No MySQL 8 isso funciona porque o driver mysql2 detecta a coluna JSON e
 * parseia sozinho. No MariaDB, JSON é armazenado como LONGTEXT com CHECK
 * (json_valid()), e o driver retorna string crua — Drizzle entrega string
 * em vez do objeto esperado, quebrando qualquer código que faça
 * `row.dadosDepois.campo`.
 *
 * Este tipo resolve mantendo o mesmo SQL ("json"), mas parseia na leitura.
 */
export const jsonText = <T = unknown>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType() {
      return 'json';
    },
    toDriver(value: T): string {
      return JSON.stringify(value);
    },
    fromDriver(value: unknown): T {
      if (value === null || value === undefined) return value as T;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      }
      return value as T;
    },
  })(name);
