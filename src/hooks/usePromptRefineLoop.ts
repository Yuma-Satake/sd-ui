"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  GeneratedImage,
  GenerateParams,
  PromptRefineCandidate,
  QueueItem,
} from "@/types/generation"

type AddToQueue = (
  params: GenerateParams,
  mode: "txt2img",
  inputImage: undefined,
  tag: string,
) => string

export type LoopState = {
  loopId: string
  round: number
  candidates: [PromptRefineCandidate, PromptRefineCandidate]
  selectedPrompt: string
}

type UsePromptRefineLoopArgs = {
  addToQueue: AddToQueue
  buildParams: (prompt: string) => GenerateParams
  queueItems: QueueItem[]
  onError: (message: string) => void
}

type UsePromptRefineLoopReturn = {
  loop: LoopState | null
  isFetchingCandidates: boolean
  start: (initialPrompt: string) => Promise<void>
  selectCandidate: (index: 0 | 1) => Promise<void>
  retryCandidate: (index: 0 | 1) => void
  confirm: () => string | null
  cancel: () => void
  handleGeneratedImage: (image: GeneratedImage) => boolean
}

const makeLoopId = (): string => `loop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const makeTag = (loopId: string, round: number, slot: "a" | "b"): string =>
  `refine:${loopId}:${round}:${slot}`

const fetchCandidates = async (prompt: string): Promise<[string, string]> => {
  const response = await fetch("/api/prompt-refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "プロンプト候補の生成に失敗しました")
  }
  return data.candidates
}

export const usePromptRefineLoop = ({
  addToQueue,
  buildParams,
  queueItems,
  onError,
}: UsePromptRefineLoopArgs): UsePromptRefineLoopReturn => {
  const [loop, setLoop] = useState<LoopState | null>(null)
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false)
  const loopRef = useRef<LoopState | null>(null)
  loopRef.current = loop

  const queueRound = useCallback(
    (
      loopId: string,
      round: number,
      prompts: [string, string],
    ): [PromptRefineCandidate, PromptRefineCandidate] => {
      const tagA = makeTag(loopId, round, "a")
      const tagB = makeTag(loopId, round, "b")
      addToQueue(buildParams(prompts[0]), "txt2img", undefined, tagA)
      addToQueue(buildParams(prompts[1]), "txt2img", undefined, tagB)
      return [
        { tag: tagA, prompt: prompts[0], status: "pending" },
        { tag: tagB, prompt: prompts[1], status: "pending" },
      ]
    },
    [addToQueue, buildParams],
  )

  const start = useCallback(
    async (initialPrompt: string): Promise<void> => {
      setIsFetchingCandidates(true)
      try {
        const prompts = await fetchCandidates(initialPrompt)
        const loopId = makeLoopId()
        const round = 1
        const candidates = queueRound(loopId, round, prompts)
        setLoop({ loopId, round, candidates, selectedPrompt: initialPrompt })
      } catch (err) {
        const message = err instanceof Error ? err.message : "プロンプト候補の生成に失敗しました"
        onError(message)
      } finally {
        setIsFetchingCandidates(false)
      }
    },
    [queueRound, onError],
  )

  const selectCandidate = useCallback(
    async (index: 0 | 1): Promise<void> => {
      const current = loopRef.current
      if (!current) return
      const chosen = current.candidates[index]
      if (chosen.status !== "completed") return

      setLoop((prev) => (prev ? { ...prev, selectedPrompt: chosen.prompt } : prev))
      setIsFetchingCandidates(true)
      try {
        const prompts = await fetchCandidates(chosen.prompt)
        const nextRound = current.round + 1
        const candidates = queueRound(current.loopId, nextRound, prompts)
        setLoop((prev) =>
          prev ? { ...prev, round: nextRound, candidates, selectedPrompt: chosen.prompt } : prev,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "プロンプト候補の生成に失敗しました"
        onError(message)
      } finally {
        setIsFetchingCandidates(false)
      }
    },
    [queueRound, onError],
  )

  const retryCandidate = useCallback(
    (index: 0 | 1): void => {
      const current = loopRef.current
      if (!current) return
      const candidate = current.candidates[index]
      if (candidate.status !== "error") return
      addToQueue(buildParams(candidate.prompt), "txt2img", undefined, candidate.tag)
      setLoop((prev) => {
        if (!prev) return prev
        const candidates = [...prev.candidates] as [PromptRefineCandidate, PromptRefineCandidate]
        candidates[index] = { ...candidates[index], status: "pending", error: undefined }
        return { ...prev, candidates }
      })
    },
    [addToQueue, buildParams],
  )

  const confirm = useCallback((): string | null => {
    const current = loopRef.current
    if (!current) return null
    setLoop(null)
    return current.selectedPrompt
  }, [])

  const cancel = useCallback((): void => {
    setLoop(null)
  }, [])

  const handleGeneratedImage = useCallback((image: GeneratedImage): boolean => {
    const current = loopRef.current
    if (!current || !image.tag) return false
    const index = current.candidates.findIndex((c) => c.tag === image.tag)
    if (index === -1) return false
    setLoop((prev) => {
      if (!prev) return prev
      const candidates = [...prev.candidates] as [PromptRefineCandidate, PromptRefineCandidate]
      candidates[index] = { ...candidates[index], status: "completed", image: image.image }
      return { ...prev, candidates }
    })
    return true
  }, [])

  useEffect(() => {
    const current = loopRef.current
    if (!current) return
    for (const item of queueItems) {
      if (item.status !== "error" || !item.tag) continue
      const index = current.candidates.findIndex(
        (c) => c.tag === item.tag && c.status === "pending",
      )
      if (index === -1) continue
      const message = item.error ?? "生成に失敗しました"
      setLoop((prev) => {
        if (!prev) return prev
        const candidates = [...prev.candidates] as [PromptRefineCandidate, PromptRefineCandidate]
        candidates[index] = { ...candidates[index], status: "error", error: message }
        return { ...prev, candidates }
      })
    }
  }, [queueItems])

  return {
    loop,
    isFetchingCandidates,
    start,
    selectCandidate,
    retryCandidate,
    confirm,
    cancel,
    handleGeneratedImage,
  }
}
