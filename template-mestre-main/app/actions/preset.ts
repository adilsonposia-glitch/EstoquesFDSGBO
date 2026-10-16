'use server'

import { parsePreset } from '@/lib/preset'
import { loadPreset, savePreset } from '@/lib/preset-store'

/**
 * Server Action para persistir o preset de aparência no banco de dados.
 * Recebe o JSON cru vindo da UI, valida com `parsePreset` e delega ao store.
 */
export async function savePresetAction(rawPreset: string | unknown) {
  const result = parsePreset(rawPreset)
  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  const saved = await savePreset(result.preset)
  if (!saved.ok) {
    return {
      ok: false as const,
      error:
        'Banco de dados não configurado. Defina DATABASE_URL para salvar presets.',
    }
  }

  return { ok: true as const, preset: result.preset }
}

/** Lê o preset salvo do banco de dados (usado na hidratação inicial). */
export async function loadPresetAction() {
  const preset = await loadPreset()
  return { preset }
}
