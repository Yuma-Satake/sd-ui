"use client"

import { ChevronDown, ChevronUp, Upload, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
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
import { cn } from "@/lib/utils"
import type { ControlNetConfig } from "@/types/generation"

type ControlNetInfo = {
  name: string
  type: string
}

type ControlNetPanelProps = {
  config: ControlNetConfig
  onChange: (config: ControlNetConfig) => void
}

export const ControlNetPanel = ({ config, onChange }: ControlNetPanelProps): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [controlnets, setControlnets] = useState<ControlNetInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchControlnets = async (): Promise<void> => {
      try {
        const response = await fetch("/api/controlnet/list")
        const data = await response.json()
        if (!data.error) {
          setControlnets(data.controlnets)
        }
      } catch {
        console.error("Failed to load ControlNets")
      } finally {
        setIsLoading(false)
      }
    }

    fetchControlnets()
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(",")[1]
        onChange({ ...config, controlImage: base64, enabled: true })
      }
      reader.readAsDataURL(file)
    },
    [config, onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
  })

  const handleToggle = (): void => {
    setIsExpanded((prev) => !prev)
  }

  const handleEnabledChange = (enabled: boolean): void => {
    onChange({ ...config, enabled })
  }

  const handleModelChange = (modelName: string): void => {
    onChange({ ...config, modelName, enabled: true })
  }

  const handleWeightChange = (weight: number): void => {
    onChange({ ...config, weight })
  }

  const handleGuidanceStartChange = (guidanceStart: number): void => {
    onChange({ ...config, guidanceStart })
  }

  const handleGuidanceEndChange = (guidanceEnd: number): void => {
    onChange({ ...config, guidanceEnd })
  }

  const handleClearImage = (): void => {
    onChange({ ...config, controlImage: null })
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ControlNet</span>
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
            <Label>Enable ControlNet</Label>
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
            <Label>ControlNet Model</Label>
            <Select
              value={config.modelName}
              onValueChange={handleModelChange}
              disabled={isLoading || controlnets.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select ControlNet"} />
              </SelectTrigger>
              <SelectContent>
                {controlnets.map((cn) => (
                  <SelectItem key={cn.name} value={cn.name}>
                    {cn.name} ({cn.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && controlnets.length === 0 && (
              <p className="text-xs text-muted-foreground">No ControlNet models found.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Control Image</Label>
            <div
              {...getRootProps()}
              className={cn(
                "relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                config.controlImage && "border-solid p-2",
              )}
            >
              <input {...getInputProps()} />
              {config.controlImage ? (
                <div className="relative w-full">
                  <img
                    src={`data:image/png;base64,${config.controlImage}`}
                    alt="Control"
                    className="max-h-[150px] w-full rounded-md object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClearImage()
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 p-4 text-muted-foreground">
                  <Upload className="h-6 w-6 opacity-50" />
                  <p className="text-xs">Drop control image here</p>
                </div>
              )}
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Guidance Start</Label>
                <span className="text-xs text-muted-foreground">
                  {config.guidanceStart.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[config.guidanceStart]}
                onValueChange={([v]) => handleGuidanceStartChange(v)}
                min={0}
                max={1}
                step={0.05}
                disabled={!config.enabled}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Guidance End</Label>
                <span className="text-xs text-muted-foreground">
                  {config.guidanceEnd.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[config.guidanceEnd]}
                onValueChange={([v]) => handleGuidanceEndChange(v)}
                min={0}
                max={1}
                step={0.05}
                disabled={!config.enabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
