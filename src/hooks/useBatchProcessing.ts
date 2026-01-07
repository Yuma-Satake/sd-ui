"use client"

import { useCallback, useState } from "react"
import type { BatchItem, GeneratedImage, GenerateParams, GenerationMode } from "@/types/generation"

type UseBatchProcessingReturn = {
  batchItems: BatchItem[]
  currentIndex: number
  isRunning: boolean
  isPaused: boolean
  startBatch: (
    prompts: string[],
    baseParams: Omit<GenerateParams, "prompt">,
    mode: GenerationMode,
    inputImage?: string,
    onImageGenerated?: (image: GeneratedImage) => void,
  ) => Promise<void>
  stopBatch: () => void
  pauseBatch: () => void
  resumeBatch: () => void
}

const generateId = (): string => `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useBatchProcessing = (): UseBatchProcessingReturn => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [shouldStop, setShouldStop] = useState(false)

  const startBatch = useCallback(
    async (
      prompts: string[],
      baseParams: Omit<GenerateParams, "prompt">,
      mode: GenerationMode,
      inputImage?: string,
      onImageGenerated?: (image: GeneratedImage) => void,
    ): Promise<void> => {
      const items: BatchItem[] = prompts.map((prompt) => ({
        id: generateId(),
        prompt,
        negative_prompt: baseParams.negative_prompt,
        status: "pending",
      }))

      setBatchItems(items)
      setCurrentIndex(0)
      setIsRunning(true)
      setIsPaused(false)
      setShouldStop(false)

      for (let i = 0; i < items.length; i++) {
        if (shouldStop) break

        while (isPaused && !shouldStop) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        if (shouldStop) break

        setCurrentIndex(i)
        setBatchItems((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item)),
        )

        try {
          const endpoint = mode === "img2img" ? "/api/generate/img2img" : "/api/generate/txt2img"

          const params: GenerateParams = {
            ...baseParams,
            prompt: items[i].prompt,
          }

          const requestBody = mode === "img2img" ? { ...params, init_image: inputImage } : params

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || "Generation failed")
          }

          setBatchItems((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, status: "completed" } : item)),
          )

          if (onImageGenerated) {
            for (const [idx, img] of data.images.entries()) {
              onImageGenerated({
                id: `${items[i].id}-${idx}`,
                image: img,
                prompt: items[i].prompt,
                mode,
                timestamp: new Date().toISOString(),
              })
            }
          }
        } catch (error) {
          console.error(`Batch item ${i} failed:`, error)
          setBatchItems((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, status: "error" } : item)),
          )
        }
      }

      setIsRunning(false)
    },
    [shouldStop, isPaused],
  )

  const stopBatch = useCallback((): void => {
    setShouldStop(true)
    setIsRunning(false)
    setIsPaused(false)
    setBatchItems([])
    setCurrentIndex(0)
  }, [])

  const pauseBatch = useCallback((): void => {
    setIsPaused(true)
  }, [])

  const resumeBatch = useCallback((): void => {
    setIsPaused(false)
  }, [])

  return {
    batchItems,
    currentIndex,
    isRunning,
    isPaused,
    startBatch,
    stopBatch,
    pauseBatch,
    resumeBatch,
  }
}
