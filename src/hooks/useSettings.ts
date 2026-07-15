"use client"

import { useCallback } from "react"
import type { AppMode } from "@/types/generation"
import { useLocalStorage } from "./useLocalStorage"

const SETTINGS_KEY = "sd-ui-settings-v2"

export type QualityMode = "fast" | "standard" | "high"

export type SimpleSettings = {
  prompt: string
  qualityMode: QualityMode
  mode: AppMode
  seed: string
}

export type QualityPreset = {
  label: string
  description: string
  steps: number
  guidanceScale: number
  width: number
  height: number
}

export const QUALITY_PRESETS: Record<QualityMode, QualityPreset> = {
  fast: {
    label: "高速",
    description: "短時間でざっくり",
    steps: 20,
    guidanceScale: 5,
    width: 1024,
    height: 1024,
  },
  standard: {
    label: "標準",
    description: "バランス重視",
    steps: 30,
    guidanceScale: 5,
    width: 1024,
    height: 1024,
  },
  high: {
    label: "高品質",
    description: "時間がかかるが綺麗",
    steps: 40,
    guidanceScale: 5,
    width: 1024,
    height: 1024,
  },
}

export const HIDDEN_NEGATIVE_PROMPT =
  "low quality, blurry, worst quality, bad anatomy, deformed, disfigured"

export const IMG2IMG_STRENGTH = 0.75

export const DEFAULT_MODEL_ID = "RunDiffusion/Juggernaut-XL-v9"

const DEFAULT_SETTINGS: SimpleSettings = {
  prompt: "",
  qualityMode: "standard",
  mode: "img2img",
  seed: "",
}

type UseSettingsReturn = {
  settings: SimpleSettings
  updateSettings: (updates: Partial<SimpleSettings>) => void
  resetSettings: () => void
}

export const useSettings = (): UseSettingsReturn => {
  const [rawSettings, setSettings] = useLocalStorage<SimpleSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const settings: SimpleSettings = { ...DEFAULT_SETTINGS, ...rawSettings }

  const updateSettings = useCallback(
    (updates: Partial<SimpleSettings>) => {
      setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...updates }))
    },
    [setSettings],
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [setSettings])

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}
