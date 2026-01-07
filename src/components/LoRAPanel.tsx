"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useState } from "react"
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
import type { LoRAConfig } from "@/types/generation"

type LoRAInfo = {
  name: string
  path: string
}

type LoRAPanelProps = {
  config: LoRAConfig
  onChange: (config: LoRAConfig) => void
}

export const LoRAPanel = ({ config, onChange }: LoRAPanelProps): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loras, setLoras] = useState<LoRAInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLoras = async (): Promise<void> => {
      try {
        const response = await fetch("/api/lora/list")
        const data = await response.json()
        if (!data.error) {
          setLoras(data.loras)
        }
      } catch {
        console.error("Failed to load LoRAs")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoras()
  }, [])

  const handleToggle = (): void => {
    setIsExpanded((prev) => !prev)
  }

  const handleEnabledChange = (enabled: boolean): void => {
    onChange({ ...config, enabled })
  }

  const handleModelChange = (modelPath: string): void => {
    onChange({ ...config, modelPath, enabled: true })
  }

  const handleWeightChange = (weight: number): void => {
    onChange({ ...config, weight })
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">LoRA</span>
          {config.enabled && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">Active</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t p-3">
          <div className="flex items-center justify-between">
            <Label>Enable LoRA</Label>
            <Button
              type="button"
              variant={config.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => handleEnabledChange(!config.enabled)}
            >
              {config.enabled ? "ON" : "OFF"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>LoRA Model</Label>
            <Select
              value={config.modelPath}
              onValueChange={handleModelChange}
              disabled={isLoading || loras.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select LoRA"} />
              </SelectTrigger>
              <SelectContent>
                {loras.map((lora) => (
                  <SelectItem key={lora.path} value={lora.path}>
                    {lora.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && loras.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No LoRA models found. Place .safetensors files in the loras folder.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Weight</Label>
              <span className="text-sm text-muted-foreground">{config.weight.toFixed(2)}</span>
            </div>
            <Slider
              value={[config.weight]}
              onValueChange={([v]) => handleWeightChange(v)}
              min={0}
              max={2}
              step={0.05}
              disabled={!config.enabled}
            />
          </div>
        </div>
      )}
    </div>
  )
}
