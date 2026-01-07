"use client"

import { useCallback } from "react"
import { useLocalStorage } from "./useLocalStorage"

const STORAGE_KEY = "sd-ui-image-history"
const MAX_HISTORY_SIZE = 50

export type HistoryImage = {
  id: string
  image: string
  prompt: string
  mode: string
  timestamp: string
}

type UseImageHistoryReturn = {
  history: HistoryImage[]
  addImages: (images: HistoryImage[]) => void
  clearHistory: () => void
  removeImage: (id: string) => void
}

/**
 * 画像履歴を管理するカスタムフック
 * @returns 履歴の状態と操作関数
 */
export const useImageHistory = (): UseImageHistoryReturn => {
  const [history, setHistory] = useLocalStorage<HistoryImage[]>(STORAGE_KEY, [])

  const addImages = useCallback(
    (images: HistoryImage[]) => {
      setHistory((prev) => {
        const newHistory = [...images, ...prev]
        return newHistory.slice(0, MAX_HISTORY_SIZE)
      })
    },
    [setHistory],
  )

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  const removeImage = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((img) => img.id !== id))
    },
    [setHistory],
  )

  return {
    history,
    addImages,
    clearHistory,
    removeImage,
  }
}
