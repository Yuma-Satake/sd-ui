"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LoopState } from "@/hooks/usePromptRefineLoop"
import { QUALITY_PRESETS, type QualityMode, type SimpleSettings } from "@/hooks/useSettings"

type PromptRefinePanelProps = {
  settings: SimpleSettings
  updateSettings: (updates: Partial<SimpleSettings>) => void
  loop: LoopState | null
  isFetchingCandidates: boolean
  onStart: (prompt: string) => void
  onConfirm: () => void
  onCancel: () => void
}

const QUALITY_ORDER: QualityMode[] = ["fast", "standard", "high"]

export const PromptRefinePanel = ({
  settings,
  updateSettings,
  loop,
  isFetchingCandidates,
  onStart,
  onConfirm,
  onCancel,
}: PromptRefinePanelProps): React.ReactNode => {
  const [draftPrompt, setDraftPrompt] = useState(settings.prompt)
  const isActive = loop !== null

  const handleStart = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!draftPrompt.trim()) return
    onStart(draftPrompt.trim())
  }

  return (
    <div className="flex flex-col gap-5">
      {!isActive ? (
        <form className="flex flex-col gap-5" onSubmit={handleStart}>
          <div className="space-y-2">
            <Label htmlFor="refine-prompt">元にするプロンプト</Label>
            <Textarea
              id="refine-prompt"
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              placeholder="例: 夕暮れの海辺を歩く猫、水彩画風"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              このプロンプトを元にOllamaが2つの改善案を提案します
            </p>
          </div>

          <div className="space-y-2">
            <Label>品質</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_ORDER.map((key) => {
                const preset = QUALITY_PRESETS[key]
                const isActiveQuality = settings.qualityMode === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateSettings({ qualityMode: key })}
                    className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                      isActiveQuality
                        ? "border-primary bg-primary/10"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm font-medium">{preset.label}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isFetchingCandidates || !draftPrompt.trim()}
          >
            {isFetchingCandidates ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                候補を生成中...
              </>
            ) : (
              "改善候補を生成する"
            )}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-sm font-medium">ラウンド {loop.round}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              AまたはBを選ぶと次の候補が自動で生成されます
            </p>
          </div>

          <div className="space-y-2">
            <Label>現在選択中のプロンプト</Label>
            <p className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
              {loop.selectedPrompt}
            </p>
          </div>

          {isFetchingCandidates && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              次の候補を生成中...
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button type="button" size="lg" className="w-full" onClick={onConfirm}>
              このプロンプトで確定する
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
