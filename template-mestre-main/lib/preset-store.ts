import 'server-only'
import { type AppPreset, DEFAULT_PRESET, parsePreset } from '@/lib/preset'

/**
 * Camada de persistência do preset de aparência.
 *
 * Hoje retorna valores padrão (sem banco conectado), mas já está preparada
 * para o banco de dados: basta preencher os blocos marcados com TODO.
 *
 * Variáveis de ambiente esperadas (defina em Project Settings → Vars):
 *   - DATABASE_URL  → string de conexão do banco (ex.: Neon/Supabase)
 *
 * Esquema sugerido da tabela:
 *   create table user_presets (
 *     user_id    text primary key,
 *     preset     jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 */

const DATABASE_URL = process.env.DATABASE_URL

/**
 * Lê o preset salvo para um usuário. Retorna `null` quando não há registro,
 * permitindo que a aplicação caia no `DEFAULT_PRESET`.
 */
export async function loadPreset(
  userId = 'default',
): Promise<AppPreset | null> {
  if (!DATABASE_URL) {
    // Sem banco conectado ainda — a UI usa o estado do localStorage.
    return null
  }

  // TODO: substituir pela query real, por exemplo (Neon + drizzle/sql):
  //
  //   const rows = await sql`
  //     select preset from user_presets where user_id = ${userId} limit 1
  //   `
  //   if (!rows[0]) return null
  //   const result = parsePreset(rows[0].preset)
  //   return result.ok ? result.preset : null
  //
  // `parsePreset` valida e normaliza o JSON vindo do banco antes de aplicar.
  void parsePreset
  void userId
  return null
}

/**
 * Salva (upsert) o preset de um usuário. Recebe o objeto já validado pela UI.
 */
export async function savePreset(
  preset: AppPreset,
  userId = 'default',
): Promise<{ ok: boolean }> {
  if (!DATABASE_URL) {
    return { ok: false }
  }

  // TODO: substituir pela query real, por exemplo (Neon + drizzle/sql):
  //
  //   await sql`
  //     insert into user_presets (user_id, preset, updated_at)
  //     values (${userId}, ${JSON.stringify(preset)}::jsonb, now())
  //     on conflict (user_id)
  //     do update set preset = excluded.preset, updated_at = now()
  //   `
  void preset
  void userId
  void DEFAULT_PRESET
  return { ok: true }
}
