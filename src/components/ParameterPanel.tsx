"use client"

import { useState } from "react"
import { Dices, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GenerateParams {
  prompt: string
  negative_prompt: string
  width?: number
  height?: number
  strength?: number
  steps: number
  guidance_scale: number
  seed: number | null
  num_images: number
}

interface ParameterPanelProps {
  mode: "txt2img" | "img2img"
  onGenerate: (params: GenerateParams) => void
  isGenerating: boolean
  hasInputImage: boolean
}

const PRESETS = {
  txt2img: [
    { name: "Default", width: 512, height: 512, steps: 30, guidance_scale: 7.5 },
    { name: "High Quality", width: 768, height: 768, steps: 50, guidance_scale: 8.0 },
    { name: "Fast", width: 512, height: 512, steps: 20, guidance_scale: 7.0 },
    { name: "Portrait", width: 512, height: 768, steps: 30, guidance_scale: 7.5 },
    { name: "Landscape", width: 768, height: 512, steps: 30, guidance_scale: 7.5 },
  ],
  img2img: [
    { name: "Light Touch", strength: 0.3, steps: 30, guidance_scale: 7.5 },
    { name: "Moderate", strength: 0.5, steps: 30, guidance_scale: 7.5 },
    { name: "Strong", strength: 0.75, steps: 30, guidance_scale: 7.5 },
    { name: "Complete Restyle", strength: 0.9, steps: 40, guidance_scale: 8.0 },
  ],
}

export function ParameterPanel({
  mode,
  onGenerate,
  isGenerating,
  hasInputImage,
}: ParameterPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [steps, setSteps] = useState(30)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [strength, setStrength] = useState(0.75)
  const [seed, setSeed] = useState("")
  const [numImages, setNumImages] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    if (mode === "img2img" && !hasInputImage) return

    const params: GenerateParams = {
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim(),
      steps,
      guidance_scale: guidanceScale,
      seed: seed ? parseInt(seed, 10) : null,
      num_images: numImages,
    }

    if (mode === "txt2img") {
      params.width = width
      params.height = height
    } else {
      params.strength = strength
    }

    onGenerate(params)
  }

  const applyPreset = (preset: (typeof PRESETS.txt2img)[0] | (typeof PRESETS.img2img)[0]) => {
    if ("width" in preset) setWidth(preset.width)
    if ("height" in preset) setHeight(preset.height)
    if (preset.steps) setSteps(preset.steps)
    if (preset.guidance_scale) setGuidanceScale(preset.guidance_scale)
    if ("strength" in preset) setStrength(preset.strength)
  }

  const randomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647).toString())
  }

  const presets = PRESETS[mode]

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to generate..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Negative Prompt</Label>
        <Textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="What to avoid..."
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Presets:</span>
        {presets.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </Button>
        ))}
      </div>

      {mode === "txt2img" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Width</Label>
            <Select value={width.toString()} onValueChange={(v) => setWidth(Number(v))}>
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
            <Select value={height.toString()} onValueChange={(v) => setHeight(Number(v))}>
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
            <Label>Strength</Label>
            <span className="text-sm text-muted-foreground">{strength.toFixed(2)}</span>
          </div>
          <Slider
            value={[strength]}
            onValueChange={([v]) => setStrength(v)}
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
          <Label>Steps</Label>
          <span className="text-sm text-muted-foreground">{steps}</span>
        </div>
        <Slider
          value={[steps]}
          onValueChange={([v]) => setSteps(v)}
          min={10}
          max={100}
          step={5}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Guidance Scale</Label>
          <span className="text-sm text-muted-foreground">{guidanceScale.toFixed(1)}</span>
        </div>
        <Slider
          value={[guidanceScale]}
          onValueChange={([v]) => setGuidanceScale(v)}
          min={1}
          max={20}
          step={0.5}
        />
      </div>

      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div className="space-y-2">
          <Label>Seed</Label>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Random"
            />
            <Button type="button" variant="outline" size="icon" onClick={randomSeed}>
              <Dices className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Images</Label>
          <Select value={numImages.toString()} onValueChange={(v) => setNumImages(Number(v))}>
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
        disabled={isGenerating || !prompt.trim() || (mode === "img2img" && !hasInputImage)}
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
        <p className="text-center text-sm text-muted-foreground">
          Upload an input image to start
        </p>
      )}
    </form>
  )
}
