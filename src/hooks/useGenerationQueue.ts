"use client"

import { useCallback, useState } from "react"
import type {
  GeneratedImage,
  GenerateParams,
  GenerationMode,
  QueueItem,
  QueueItemStatus,
} from "@/types/generation"

type UseGenerationQueueReturn = {
  queueItems: QueueItem[]
  isAutoRunning: boolean
  isProcessing: boolean
  addToQueue: (params: GenerateParams, mode: GenerationMode, inputImage?: string) => void
  removeFromQueue: (id: string) => void
  moveInQueue: (id: string, direction: "up" | "down") => void
  clearCompleted: () => void
  toggleAutoRun: () => void
  processQueue: (onImageGenerated: (image: GeneratedImage) => void) => Promise<void>
}

const generateId = (): string => `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useGenerationQueue = (): UseGenerationQueueReturn => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const addToQueue = useCallback(
    (params: GenerateParams, mode: GenerationMode, inputImage?: string): void => {
      const newItem: QueueItem = {
        id: generateId(),
        params,
        mode,
        inputImage,
        status: "pending",
        createdAt: new Date().toISOString(),
      }

      setQueueItems((prev) => [...prev, newItem])
    },
    [],
  )

  const removeFromQueue = useCallback((id: string): void => {
    setQueueItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const moveInQueue = useCallback((id: string, direction: "up" | "down"): void => {
    setQueueItems((prev) => {
      const index = prev.findIndex((item) => item.id === id)
      if (index === -1) return prev

      const newIndex = direction === "up" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newItems = [...prev]
      const item = newItems[index]
      newItems[index] = newItems[newIndex]
      newItems[newIndex] = item

      return newItems
    })
  }, [])

  const clearCompleted = useCallback((): void => {
    setQueueItems((prev) => prev.filter((item) => item.status !== "completed"))
  }, [])

  const toggleAutoRun = useCallback((): void => {
    setIsAutoRunning((prev) => !prev)
  }, [])

  const updateItemStatus = useCallback(
    (id: string, status: QueueItemStatus, updates?: Partial<QueueItem>): void => {
      setQueueItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, ...updates } : item)),
      )
    },
    [],
  )

  const processQueue = useCallback(
    async (onImageGenerated: (image: GeneratedImage) => void): Promise<void> => {
      if (isProcessing) return

      setIsProcessing(true)

      try {
        const pendingItems = queueItems.filter((item) => item.status === "pending")

        for (const item of pendingItems) {
          if (!isAutoRunning) break

          updateItemStatus(item.id, "processing")

          try {
            const endpoint =
              item.mode === "img2img" ? "/api/generate/img2img" : "/api/generate/txt2img"

            const requestBody =
              item.mode === "img2img"
                ? { ...item.params, init_image: item.inputImage }
                : item.params

            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            })

            const data = await response.json()

            if (!response.ok) {
              throw new Error(data.error || "Generation failed")
            }

            updateItemStatus(item.id, "completed", { result: data.images })

            for (const [idx, img] of data.images.entries()) {
              onImageGenerated({
                id: `${item.id}-${idx}`,
                image: img,
                prompt: item.params.prompt,
                mode: item.mode,
                timestamp: new Date().toISOString(),
              })
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            updateItemStatus(item.id, "error", { error: errorMessage })
          }
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [queueItems, isAutoRunning, isProcessing, updateItemStatus],
  )

  return {
    queueItems,
    isAutoRunning,
    isProcessing,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    clearCompleted,
    toggleAutoRun,
    processQueue,
  }
}
