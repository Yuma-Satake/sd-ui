"use client"

import { useCallback, useRef, useState } from "react"
import type {
  GeneratedImage,
  GenerateParams,
  GenerationMode,
  QueueItem,
  QueueItemStatus,
} from "@/types/generation"

type UseGenerationQueueReturn = {
  queueItems: QueueItem[]
  isProcessing: boolean
  addToQueue: (
    params: GenerateParams,
    mode: GenerationMode,
    inputImage?: string,
    tag?: string,
  ) => string
  removeFromQueue: (id: string) => void
  moveInQueue: (id: string, direction: "up" | "down") => void
  processQueue: (
    onImageGenerated: (image: GeneratedImage) => void,
    onError: (message: string) => void,
  ) => Promise<void>
}

const generateId = (): string => `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const POLL_INTERVAL_MS = 1000
const MAX_POLLS = 1800

export const useGenerationQueue = (): UseGenerationQueueReturn => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)
  const queueRef = useRef<QueueItem[]>([])

  queueRef.current = queueItems

  const addToQueue = useCallback(
    (params: GenerateParams, mode: GenerationMode, inputImage?: string, tag?: string): string => {
      const id = generateId()
      const newItem: QueueItem = {
        id,
        params,
        mode,
        inputImage,
        status: "pending",
        createdAt: new Date().toISOString(),
        tag,
      }
      setQueueItems((prev) => [...prev, newItem])
      return id
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

  const bumpProgress = useCallback((id: string, next: number): void => {
    setQueueItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const current = item.progress ?? 0
        return current < next ? { ...item, progress: next } : item
      }),
    )
  }, [])

  const setItemStatus = useCallback(
    (id: string, status: QueueItemStatus, updates?: Partial<QueueItem>): void => {
      setQueueItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, ...updates } : item)),
      )
    },
    [],
  )

  const processItem = useCallback(
    async (item: QueueItem, onImageGenerated: (image: GeneratedImage) => void): Promise<void> => {
      setItemStatus(item.id, "processing", { progress: undefined, error: undefined })

      const endpoint = item.mode === "img2img" ? "/api/generate/img2img" : "/api/generate/txt2img"
      const requestBody =
        item.mode === "img2img" ? { ...item.params, init_image: item.inputImage } : item.params

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "生成の開始に失敗しました")
      }
      const { jobId } = data

      let notFoundStreak = 0
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        const statusResponse = await fetch(`/api/job/${jobId}`)
        const statusData = await statusResponse.json()

        if (statusData.status === "completed") {
          const images: string[] = statusData.result?.images ?? []
          const seeds: number[] = statusData.result?.seeds ?? []
          for (const [idx, img] of images.entries()) {
            onImageGenerated({
              id: `${item.id}-${idx}`,
              image: img,
              prompt: item.params.prompt,
              mode: item.mode,
              timestamp: new Date().toISOString(),
              seed: seeds[idx] ?? 0,
              tag: item.tag,
            })
          }
          setQueueItems((prev) => prev.filter((q) => q.id !== item.id))
          return
        }

        if (statusData.status === "failed") {
          throw new Error(statusData.error || "生成に失敗しました")
        }

        if (statusData.status === "not_found") {
          notFoundStreak += 1
          if (notFoundStreak >= 5) {
            throw new Error("ジョブが失われました。サーバーを再起動してもう一度お試しください")
          }
          continue
        }
        notFoundStreak = 0

        if (statusData.progress !== undefined && statusData.progress > 0) {
          bumpProgress(item.id, statusData.progress)
        }
      }

      throw new Error("生成がタイムアウトしました")
    },
    [setItemStatus, bumpProgress],
  )

  const processQueue = useCallback(
    async (
      onImageGenerated: (image: GeneratedImage) => void,
      onError: (message: string) => void,
    ): Promise<void> => {
      if (processingRef.current) return
      processingRef.current = true
      setIsProcessing(true)

      try {
        while (true) {
          const next = queueRef.current.find((item) => item.status === "pending")
          if (!next) break

          try {
            await processItem(next, onImageGenerated)
          } catch (err) {
            const message = err instanceof Error ? err.message : "不明なエラーが発生しました"
            setItemStatus(next.id, "error", { error: message })
            onError(message)
          }
        }
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [processItem, setItemStatus],
  )

  return {
    queueItems,
    isProcessing,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    processQueue,
  }
}
