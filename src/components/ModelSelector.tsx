"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Model = {
  id: string
  name: string
  path: string
}

type ModelSelectorProps = {
  value: string
  onChange: (modelId: string) => void
}

const DEFAULT_MODEL = "runwayml/stable-diffusion-v1-5"

export const ModelSelector = ({ value, onChange }: ModelSelectorProps): React.ReactNode => {
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModels = async (): Promise<void> => {
      try {
        const response = await fetch("/api/model/list")
        const data = await response.json()
        if (data.error) {
          setError(data.error)
          setModels([{ id: DEFAULT_MODEL, name: "Stable Diffusion v1.5", path: DEFAULT_MODEL }])
        } else {
          setModels(data.models)
        }
      } catch {
        setError("Failed to load models")
        setModels([{ id: DEFAULT_MODEL, name: "Stable Diffusion v1.5", path: DEFAULT_MODEL }])
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [])

  return (
    <div className="space-y-2">
      <Label>Model</Label>
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading..." : "Select model"} />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </div>
  )
}
