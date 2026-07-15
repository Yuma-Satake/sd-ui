"use client"

import { AlertCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { GeneratedImages } from "@/components/GeneratedImages"
import { ImageUploader } from "@/components/ImageUploader"
import { ParameterPanel } from "@/components/ParameterPanel"
import { PromptRefineComparison } from "@/components/PromptRefineComparison"
import { PromptRefinePanel } from "@/components/PromptRefinePanel"
import { QueuePanel } from "@/components/QueuePanel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { useToast } from "@/hooks/use-toast"
import { useGenerationQueue } from "@/hooks/useGenerationQueue"
import { type HistoryImage, useImageHistory } from "@/hooks/useImageHistory"
import { usePromptRefineLoop } from "@/hooks/usePromptRefineLoop"
import {
  DEFAULT_MODEL_ID,
  HIDDEN_NEGATIVE_PROMPT,
  IMG2IMG_STRENGTH,
  QUALITY_PRESETS,
  type SimpleSettings,
  useSettings,
} from "@/hooks/useSettings"
import type { ErrorType } from "@/types/error"
import { createAppError } from "@/types/error"
import type { AppMode, GeneratedImage, GenerateParams } from "@/types/generation"

const parseSeed = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

const buildParams = (settings: SimpleSettings, mode: "txt2img" | "img2img"): GenerateParams => {
  const preset = QUALITY_PRESETS[settings.qualityMode]
  const params: GenerateParams = {
    prompt: settings.prompt.trim(),
    negative_prompt: HIDDEN_NEGATIVE_PROMPT,
    steps: preset.steps,
    guidance_scale: preset.guidanceScale,
    seed: parseSeed(settings.seed),
    num_images: 1,
    model_id: DEFAULT_MODEL_ID,
  }
  if (mode === "txt2img") {
    params.width = preset.width
    params.height = preset.height
  } else {
    params.strength = IMG2IMG_STRENGTH
  }
  return params
}

const inferErrorType = (message: string): ErrorType => {
  const lower = message.toLowerCase()
  if (lower.includes("network") || lower.includes("failed to fetch")) return "network"
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout"
  if (lower.includes("aborted")) return "timeout"
  return "api"
}

const getErrorTitle = (type: ErrorType): string => {
  const titles: Record<ErrorType, string> = {
    network: "ネットワークエラー",
    api: "APIエラー",
    timeout: "タイムアウト",
    validation: "入力エラー",
    unknown: "エラー",
  }
  return titles[type]
}

const formatTimestamp = (date: Date): string =>
  new Date(date).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })

export default function Home(): React.ReactNode {
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [showErrorLog, setShowErrorLog] = useState(false)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)

  const { history, addImages, clearHistory, removeImage } = useImageHistory()
  const { settings, updateSettings } = useSettings()
  const mode = settings.mode
  const setMode = useCallback((next: AppMode) => updateSettings({ mode: next }), [updateSettings])

  const { queueItems, isProcessing, addToQueue, removeFromQueue, moveInQueue, processQueue } =
    useGenerationQueue()

  const { toasts, toast, dismiss } = useToast()
  const { errorLog, handleError, clearErrorLog, markErrorAsResolved } = useErrorHandler()

  const processingItem = useMemo(
    () => queueItems.find((item) => item.status === "processing"),
    [queueItems],
  )
  const isGenerating = isProcessing
  const progress = processingItem?.progress ?? null

  const showErrorToast = useCallback(
    (message: string): void => {
      const type = inferErrorType(message)
      const appError = createAppError(new Error(message), { type })
      handleError(appError)
      toast({
        title: getErrorTitle(type),
        description: message,
        variant: "destructive",
        duration: 8000,
      })
    },
    [handleError, toast],
  )

  const buildRefineParams = useCallback(
    (prompt: string): GenerateParams => ({
      ...buildParams(settings, "txt2img"),
      prompt,
    }),
    [settings],
  )

  const refineLoop = usePromptRefineLoop({
    addToQueue,
    buildParams: buildRefineParams,
    queueItems,
    onError: showErrorToast,
  })

  const handleImageGenerated = useCallback(
    (image: GeneratedImage) => {
      refineLoop.handleGeneratedImage(image)
      const historyImage: HistoryImage = {
        id: image.id,
        image: image.image,
        prompt: image.prompt,
        mode: image.mode,
        timestamp: image.timestamp,
        seed: image.seed,
      }
      addImages([historyImage])
    },
    [addImages, refineLoop.handleGeneratedImage],
  )

  useEffect(() => {
    if (processingItem && generationStartTime === null) {
      setGenerationStartTime(Date.now())
    } else if (!processingItem && generationStartTime !== null) {
      setGenerationStartTime(null)
    }
  }, [processingItem, generationStartTime])

  useEffect(() => {
    if (!isProcessing) {
      const hasPending = queueItems.some((item) => item.status === "pending")
      if (hasPending) {
        processQueue(handleImageGenerated, showErrorToast)
      }
    }
  }, [isProcessing, queueItems, processQueue, handleImageGenerated, showErrorToast])

  const getEstimatedTimeRemaining = useCallback((): string => {
    if (!generationStartTime || progress === null || progress <= 0) return ""
    const elapsed = Date.now() - generationStartTime
    const estimatedTotal = elapsed / (progress / 100)
    const remaining = Math.max(0, estimatedTotal - elapsed)
    const seconds = Math.ceil(remaining / 1000)
    if (seconds < 60) return `残り約${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `残り約${minutes}分${secs}秒`
  }, [generationStartTime, progress])

  const handleGenerate = useCallback((): void => {
    if (mode === "prompt-refine") return
    if (!settings.prompt.trim()) return
    if (mode === "img2img" && !inputImage) return
    const params = buildParams(settings, mode)
    addToQueue(params, mode, inputImage || undefined)
    toast({
      title: "生成待ちに追加しました",
      description: "順番に処理されます",
      variant: "success",
      duration: 2000,
    })
  }, [settings, mode, inputImage, addToQueue, toast])

  const handleUseAsInput = useCallback(
    async (imageUrl: string): Promise<void> => {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(",")[1] ?? "")
          }
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        })
        setInputImage(base64)
        setMode("img2img")
        toast({
          title: "入力画像に設定しました",
          description: "「画像から作る」モードに切り替えました",
          variant: "success",
          duration: 2000,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "画像の読み込みに失敗しました"
        toast({
          title: "入力画像の設定に失敗しました",
          description: message,
          variant: "destructive",
          duration: 4000,
        })
      }
    },
    [setMode, toast],
  )

  const handleReuseSeed = useCallback(
    (seed: number): void => {
      updateSettings({ seed: String(seed) })
      toast({
        title: "seedを設定しました",
        description: `seed=${seed} を次回の生成で使用します`,
        variant: "success",
        duration: 2000,
      })
    },
    [updateSettings, toast],
  )

  const handleConfirmRefine = useCallback((): void => {
    const prompt = refineLoop.confirm()
    if (prompt === null) return
    updateSettings({ prompt, mode: "txt2img" })
    toast({
      title: "プロンプトを反映しました",
      description: "「文章から作る」モードに切り替えました",
      variant: "success",
      duration: 2000,
    })
  }, [refineLoop.confirm, updateSettings, toast])

  const unresolvedErrors = errorLog.filter((e) => !e.resolved)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <h1 className="text-xl font-semibold">お手軽 画像生成</h1>
        <div className="flex items-center gap-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as AppMode)}>
            <TabsList>
              <TabsTrigger value="img2img">画像から作る</TabsTrigger>
              <TabsTrigger value="txt2img">文章から作る</TabsTrigger>
              <TabsTrigger value="prompt-refine">プロンプトを改善する</TabsTrigger>
            </TabsList>
          </Tabs>
          <ThemeToggle />
        </div>
      </header>

      {isGenerating && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-6 py-3 shadow-md">
          {progress === null ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                生成中... モデル準備中のため進捗を測定できません
              </span>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  生成中... {getEstimatedTimeRemaining()}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </>
          )}
        </div>
      )}

      <main className="flex flex-1">
        <aside className="flex w-[380px] flex-col gap-5 overflow-y-auto border-r bg-card p-5">
          {mode === "img2img" && (
            <ImageUploader currentImage={inputImage} onImageSelect={setInputImage} />
          )}

          {mode === "prompt-refine" ? (
            <PromptRefinePanel
              settings={settings}
              updateSettings={updateSettings}
              loop={refineLoop.loop}
              isFetchingCandidates={refineLoop.isFetchingCandidates}
              onStart={refineLoop.start}
              onConfirm={handleConfirmRefine}
              onCancel={refineLoop.cancel}
            />
          ) : (
            <ParameterPanel
              mode={mode}
              onGenerate={handleGenerate}
              isGenerating={false}
              hasInputImage={!!inputImage}
              settings={settings}
              updateSettings={updateSettings}
            />
          )}

          <QueuePanel items={queueItems} onRemoveItem={removeFromQueue} onMoveItem={moveInQueue} />

          {unresolvedErrors.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm"
                onClick={() => setShowErrorLog(!showErrorLog)}
              >
                <span className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  エラーログ ({unresolvedErrors.length})
                </span>
                {showErrorLog ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showErrorLog && (
                <div className="mt-3 space-y-2">
                  {unresolvedErrors.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded border bg-background p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-destructive">
                          {getErrorTitle(entry.type)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => markErrorAsResolved(entry.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-muted-foreground">{entry.message}</p>
                    </div>
                  ))}
                  {unresolvedErrors.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground">
                      他 {unresolvedErrors.length - 5} 件
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearErrorLog}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    ログを消去
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="flex-1 overflow-y-auto p-5">
          {mode === "prompt-refine" ? (
            <PromptRefineComparison
              loop={refineLoop.loop}
              onSelect={refineLoop.selectCandidate}
              onRetry={refineLoop.retryCandidate}
            />
          ) : (
            <GeneratedImages
              images={history}
              onUseAsInput={handleUseAsInput}
              onClearHistory={clearHistory}
              onRemoveImage={removeImage}
              onReuseSeed={handleReuseSeed}
            />
          )}
        </section>
      </main>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
