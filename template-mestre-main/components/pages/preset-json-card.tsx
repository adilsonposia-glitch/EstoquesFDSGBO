'use client'

import { Check, Copy, Database, Download, Upload } from '@/components/ui/icons'
import { useEffect, useState, useTransition } from 'react'
import { savePresetAction } from '@/app/actions/preset'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAppPreset } from '@/hooks/use-app-preset'
import { parsePreset, serializePreset } from '@/lib/preset'

export function PresetJsonCard() {
  const { preset, applyPreset } = useAppPreset()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [isSaving, startSaving] = useTransition()
  // O preset depende de valores que só existem no cliente (tema/paleta do
  // localStorage). Renderizar o JSON antes da montagem causaria divergência de
  // hidratação, então só o exibimos após montar.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const json = serializePreset(preset)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast({ variant: 'success', title: 'Configuração copiada' })
    } catch {
      toast({ variant: 'error', title: 'Não foi possível copiar' })
    }
  }

  const handleImport = () => {
    const result = parsePreset(importText)
    if (!result.ok) {
      toast({
        variant: 'error',
        title: 'Importação falhou',
        description: result.error,
      })
      return
    }
    applyPreset(result.preset)
    setImportText('')
    toast({
      variant: 'success',
      title: 'Configuração importada',
      description: 'O preset foi aplicado em todo o sistema.',
    })
  }

  const handleSave = () => {
    startSaving(async () => {
      const res = await savePresetAction(json)
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Preset salvo',
          description: 'A configuração foi persistida no banco de dados.',
        })
      } else {
        toast({
          variant: 'warning',
          title: 'Salvar indisponível',
          description: res.error,
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preset (JSON)</CardTitle>
        <CardDescription>
          Toda a configuração de aparência em um objeto pronto para salvar no
          banco de dados. Copie, importe ou persista o preset.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Configuração atual */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Configuração atual</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
            {mounted ? json : 'Carregando configuração...'}
          </pre>
        </div>

        {/* Importar */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="preset-import">Importar configuração</Label>
          <Textarea
            id="preset-import"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='Cole um JSON de preset aqui, ex: { "palette": "blue", "theme": "dark" }'
            className="min-h-28 font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              <Upload />
              Importar e aplicar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Database />
              {isSaving ? 'Salvando...' : 'Salvar no banco'}
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Download className="size-3.5 shrink-0" />
            Campos ausentes ou inválidos usam o valor padrão automaticamente.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
