"use client"

import { useCallback } from "react"
import type { ControlNetConfig, LoRAConfig, SamplerType } from "@/types/generation"
import { useLocalStorage } from "./useLocalStorage"

const SETTINGS_KEY = "sd-ui-settings"
const PRESETS_KEY = "sd-ui-custom-presets"

export type GenerationSettings = {
  prompt: string
  negativePrompt: string
  width: number
  height: number
  strength: number
  steps: number
  guidanceScale: number
  seed: string
  numImages: number
  modelId: string
  lora: LoRAConfig
  controlnet: ControlNetConfig
  sampler: SamplerType
}

export type CustomPreset = {
  id: string
  name: string
  mode: "txt2img" | "img2img"
  settings: Partial<GenerationSettings>
}

const DEFAULT_LORA: LoRAConfig = {
  enabled: false,
  modelPath: "",
  weight: 1.0,
}

const DEFAULT_CONTROLNET: ControlNetConfig = {
  enabled: false,
  modelName: "",
  controlImage: null,
  weight: 1.0,
  guidanceStart: 0.0,
  guidanceEnd: 1.0,
}

const DEFAULT_SETTINGS: GenerationSettings = {
  prompt: "",
  negativePrompt: "",
  width: 512,
  height: 512,
  strength: 0.75,
  steps: 30,
  guidanceScale: 7.5,
  seed: "",
  numImages: 1,
  modelId: "runwayml/stable-diffusion-v1-5",
  lora: DEFAULT_LORA,
  controlnet: DEFAULT_CONTROLNET,
  sampler: "dpm++_2m",
}

type UseSettingsReturn = {
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

/**
 * 設定の永続化を管理するカスタムフック
 * @returns 設定の状態と操作関数
 */
export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useLocalStorage<GenerationSettings>(
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
  )
  const [customPresets, setCustomPresets] = useLocalStorage<CustomPreset[]>(PRESETS_KEY, [])

  const updateSettings = useCallback(
    (updates: Partial<GenerationSettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }))
    },
    [setSettings],
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [setSettings])

  const savePreset = useCallback(
    (name: string, mode: "txt2img" | "img2img", presetSettings: Partial<GenerationSettings>) => {
      const newPreset: CustomPreset = {
        id: `preset-${Date.now()}`,
        name,
        mode,
        settings: presetSettings,
      }
      setCustomPresets((prev) => [...prev, newPreset])
    },
    [setCustomPresets],
  )

  const deletePreset = useCallback(
    (id: string) => {
      setCustomPresets((prev) => prev.filter((p) => p.id !== id))
    },
    [setCustomPresets],
  )

  const applyPreset = useCallback(
    (preset: CustomPreset) => {
      updateSettings(preset.settings)
    },
    [updateSettings],
  )

  return {
    settings,
    updateSettings,
    resetSettings,
    customPresets,
    savePreset,
    deletePreset,
    applyPreset,
  }
}
