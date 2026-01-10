"use client"

import { Dices, Loader2, RotateCcw, Save, Trash2 } from "lucide-react"
import { useState } from "react"
import { ControlNetPanel } from "@/components/ControlNetPanel"
import { LoRAPanel } from "@/components/LoRAPanel"
import { ModelSelector } from "@/components/ModelSelector"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import type { CustomPreset, GenerationSettings } from "@/hooks/useSettings"
import type { ControlNetConfig, LoRAConfig, SamplerType } from "@/types/generation"

type GenerateParams = {
  prompt: string
  negative_prompt: string
  width?: number
  height?: number
  strength?: number
  steps: number
  guidance_scale: number
  seed: number | null
  num_images: number
  model_id?: string
  sampler?: SamplerType
  lora?: LoRAConfig
  controlnet?: ControlNetConfig
}

type ParameterPanelProps = {
  mode: "txt2img" | "img2img"
  onGenerate: (params: GenerateParams) => void
  isGenerating: boolean
  hasInputImage: boolean
  settings: GenerationSettings
  updateSettings: (updates: Partial<GenerationSettings>) => void
  resetSettings: () => void
  customPresets: CustomPreset[]
  savePreset: (
    name: string,
    mode: "txt2img" | "img2img",
    settings: Partial<GenerationSettings>,
  ) => void
  deletePreset: (id: string) => void
  applyPreset: (preset: CustomPreset) => void
}

const SAMPLER_OPTIONS: { id: SamplerType; name: string }[] = [
  { id: "dpm++_2m", name: "DPM++ 2M" },
  { id: "dpm++_2m_karras", name: "DPM++ 2M Karras" },
  { id: "dpm++_sde", name: "DPM++ SDE" },
  { id: "dpm++_sde_karras", name: "DPM++ SDE Karras" },
  { id: "euler", name: "Euler" },
  { id: "euler_a", name: "Euler Ancestral" },
  { id: "ddim", name: "DDIM" },
  { id: "pndm", name: "PNDM" },
  { id: "lms", name: "LMS" },
  { id: "heun", name: "Heun" },
  { id: "dpm2", name: "DPM2" },
  { id: "dpm2_a", name: "DPM2 Ancestral" },
  { id: "unipc", name: "UniPC" },
]

const DEFAULT_PRESETS = {
  txt2img: [
    { name: "Default", width: 512, height: 512, steps: 30, guidanceScale: 7.5 },
    { name: "High Quality", width: 768, height: 768, steps: 50, guidanceScale: 8.0 },
    { name: "Fast", width: 512, height: 512, steps: 20, guidanceScale: 7.0 },
    { name: "Portrait", width: 512, height: 768, steps: 30, guidanceScale: 7.5 },
    { name: "Landscape", width: 768, height: 512, steps: 30, guidanceScale: 7.5 },
  ],
  img2img: [
    { name: "Light Touch", strength: 0.3, steps: 30, guidanceScale: 7.5 },
    { name: "Moderate", strength: 0.5, steps: 30, guidanceScale: 7.5 },
    { name: "Strong", strength: 0.75, steps: 30, guidanceScale: 7.5 },
    { name: "Complete Restyle", strength: 0.9, steps: 40, guidanceScale: 8.0 },
  ],
}

export const ParameterPanel = ({
  mode,
  onGenerate,
  isGenerating,
  hasInputImage,
  settings,
  updateSettings,
  resetSettings,
  customPresets,
  savePreset,
  deletePreset,
  applyPreset,
}: ParameterPanelProps): React.ReactNode => {
  const [presetName, setPresetName] = useState("")
  const [showPresetInput, setShowPresetInput] = useState(false)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!settings.prompt.trim()) return
    if (mode === "img2img" && !hasInputImage) return

    const params: GenerateParams = {
      prompt: settings.prompt.trim(),
      negative_prompt: settings.negativePrompt.trim(),
      steps: settings.steps,
      guidance_scale: settings.guidanceScale,
      seed: settings.seed ? Number.parseInt(settings.seed, 10) : null,
      num_images: settings.numImages,
      model_id: settings.modelId,
      sampler: settings.sampler,
    }

    if (settings.lora.enabled && settings.lora.modelPath) {
      params.lora = settings.lora
    }

    if (settings.controlnet.enabled && settings.controlnet.modelName) {
      params.controlnet = settings.controlnet
    }

    if (mode === "txt2img") {
      params.width = settings.width
      params.height = settings.height
    } else {
      params.strength = settings.strength
    }

    onGenerate(params)
  }

  const applyDefaultPreset = (
    preset: (typeof DEFAULT_PRESETS.txt2img)[0] | (typeof DEFAULT_PRESETS.img2img)[0],
  ): void => {
    const updates: Partial<GenerationSettings> = {}
    if ("width" in preset) updates.width = preset.width
    if ("height" in preset) updates.height = preset.height
    if (preset.steps) updates.steps = preset.steps
    if (preset.guidanceScale) updates.guidanceScale = preset.guidanceScale
    if ("strength" in preset) updates.strength = preset.strength
    updateSettings(updates)
  }

  const handleSavePreset = (): void => {
    if (!presetName.trim()) return

    const currentSettings: Partial<GenerationSettings> = {
      steps: settings.steps,
      guidanceScale: settings.guidanceScale,
      numImages: settings.numImages,
    }

    if (mode === "txt2img") {
      currentSettings.width = settings.width
      currentSettings.height = settings.height
    } else {
      currentSettings.strength = settings.strength
    }

    savePreset(presetName.trim(), mode, currentSettings)
    setPresetName("")
    setShowPresetInput(false)
  }

  const randomSeed = (): void => {
    updateSettings({ seed: Math.floor(Math.random() * 2147483647).toString() })
  }

  const defaultPresets = DEFAULT_PRESETS[mode]
  const modeCustomPresets = customPresets.filter((p) => p.mode === mode)

  const handleLoRAChange = (lora: LoRAConfig): void => {
    updateSettings({ lora })
  }

  const handleControlNetChange = (controlnet: ControlNetConfig): void => {
    updateSettings({ controlnet })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <ModelSelector value={settings.modelId} onChange={(modelId) => updateSettings({ modelId })} />

      <div className="space-y-2">
        <Label>Sampler</Label>
        <Select
          value={settings.sampler}
          onValueChange={(v) => updateSettings({ sampler: v as SamplerType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAMPLER_OPTIONS.map((sampler) => (
              <SelectItem key={sampler.id} value={sampler.id}>
                {sampler.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea
          value={settings.prompt}
          onChange={(e) => updateSettings({ prompt: e.target.value })}
          placeholder="Describe what you want to generate..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Negative Prompt</Label>
        <Textarea
          value={settings.negativePrompt}
          onChange={(e) => updateSettings({ negativePrompt: e.target.value })}
          placeholder="What to avoid..."
          rows={2}
        />
      </div>

      <LoRAPanel config={settings.lora} onChange={handleLoRAChange} />

      <ControlNetPanel config={settings.controlnet} onChange={handleControlNetChange} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Presets:</span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowPresetInput(!showPresetInput)}
              title="Save current settings as preset"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={resetSettings}
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {showPresetInput && (
          <div className="flex gap-2">
            <input
              type="text"
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleSavePreset}
            >
              Save
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {defaultPresets.map((preset) => (
            <Button
              key={preset.name}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => applyDefaultPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
          {modeCustomPresets.map((preset) => (
            <div key={preset.id} className="group relative">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-6 px-2 pr-6 text-xs"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
              <button
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => deletePreset(preset.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {mode === "txt2img" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Width</Label>
            <Select
              value={settings.width.toString()}
              onValueChange={(v) => updateSettings({ width: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[256, 384, 512, 640, 768, 896, 1024].map((v) => (
                  <SelectItem key={v} value={v.toString()}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Height</Label>
            <Select
              value={settings.height.toString()}
              onValueChange={(v) => updateSettings({ height: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[256, 384, 512, 640, 768, 896, 1024].map((v) => (
                  <SelectItem key={v} value={v.toString()}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Strength</Label>
              <p className="text-xs text-muted-foreground">元画像からの変化量</p>
            </div>
            <span className="text-sm text-muted-foreground">{settings.strength.toFixed(2)}</span>
          </div>
          <Slider
            value={[settings.strength]}
            onValueChange={([v]) => updateSettings({ strength: v })}
            min={0}
            max={1}
            step={0.05}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span>
            <span>Complete</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Steps</Label>
            <p className="text-xs text-muted-foreground">生成ステップ数（速度に影響）</p>
          </div>
          <span className="text-sm text-muted-foreground">{settings.steps}</span>
        </div>
        <Slider
          value={[settings.steps]}
          onValueChange={([v]) => updateSettings({ steps: v })}
          min={10}
          max={100}
          step={5}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Guidance Scale</Label>
            <p className="text-xs text-muted-foreground">プロンプトへの忠実度</p>
          </div>
          <span className="text-sm text-muted-foreground">{settings.guidanceScale.toFixed(1)}</span>
        </div>
        <Slider
          value={[settings.guidanceScale]}
          onValueChange={([v]) => updateSettings({ guidanceScale: v })}
          min={1}
          max={20}
          step={0.5}
        />
      </div>

      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div className="space-y-2">
          <div>
            <Label>Seed</Label>
            <p className="text-xs text-muted-foreground">乱数シード（再現性）</p>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
              value={settings.seed}
              onChange={(e) => updateSettings({ seed: e.target.value })}
              placeholder="Random"
            />
            <Button type="button" variant="outline" size="icon" onClick={randomSeed}>
              <Dices className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <Label>Images</Label>
            <p className="text-xs text-muted-foreground">生成枚数</p>
          </div>
          <Select
            value={settings.numImages.toString()}
            onValueChange={(v) => updateSettings({ numImages: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((v) => (
                <SelectItem key={v} value={v.toString()}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isGenerating || !settings.prompt.trim() || (mode === "img2img" && !hasInputImage)}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate"
        )}
      </Button>

      {mode === "img2img" && !hasInputImage && (
        <p className="text-center text-sm text-muted-foreground">Upload an input image to start</p>
      )}
    </form>
  )
}
