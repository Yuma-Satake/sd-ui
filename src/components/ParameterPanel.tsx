"use client"

import { Loader2, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QUALITY_PRESETS, type QualityMode, type SimpleSettings } from "@/hooks/useSettings"
import { cn } from "@/lib/utils"

type ParameterPanelProps = {
  mode: "txt2img" | "img2img"
  onGenerate: () => void
  isGenerating: boolean
  hasInputImage: boolean
  settings: SimpleSettings
  updateSettings: (updates: Partial<SimpleSettings>) => void
}

const QUALITY_ORDER: QualityMode[] = ["fast", "standard", "high"]

export const ParameterPanel = ({
  mode,
  onGenerate,
  isGenerating,
  hasInputImage,
  settings,
  updateSettings,
}: ParameterPanelProps): React.ReactNode => {
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!settings.prompt.trim()) return
    if (mode === "img2img" && !hasInputImage) return
    onGenerate()
  }

  const disabled = isGenerating || !settings.prompt.trim() || (mode === "img2img" && !hasInputImage)

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="prompt">何を作りたいですか？</Label>
        <Textarea
          id="prompt"
          value={settings.prompt}
          onChange={(e) => updateSettings({ prompt: e.target.value })}
          placeholder="例: 夕暮れの海辺を歩く猫、水彩画風"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          英語で書くと精度が上がります（例: a cat walking on the beach at sunset, watercolor）
        </p>
      </div>

      <div className="space-y-2">
        <Label>品質</Label>
        <div className="grid grid-cols-3 gap-2">
          {QUALITY_ORDER.map((key) => {
            const preset = QUALITY_PRESETS[key]
            const isActive = settings.qualityMode === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => updateSettings({ qualityMode: key })}
                className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{preset.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seed">Seed（空欄でランダム）</Label>
        <div className="flex gap-2">
          <input
            id="seed"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={settings.seed}
            onChange={(e) => updateSettings({ seed: e.target.value.replace(/[^0-9]/g, "") })}
            placeholder="ランダム"
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateSettings({ seed: "" })}
            title="ランダムに戻す"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          同じseed・プロンプト・品質なら同じ画像が生成されます
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={disabled}>
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            生成中...
          </>
        ) : (
          "生成する"
        )}
      </Button>

      {mode === "img2img" && !hasInputImage && (
        <p className="text-center text-sm text-muted-foreground">
          まずは元にする画像をアップロードしてください
        </p>
      )}
    </form>
  )
}
