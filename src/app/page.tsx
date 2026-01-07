"use client"

import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { BatchInput } from "@/components/BatchInput"
import { GeneratedImages } from "@/components/GeneratedImages"
import { ImageUploader } from "@/components/ImageUploader"
import { ParameterPanel } from "@/components/ParameterPanel"
import { QueuePanel } from "@/components/QueuePanel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { useToast } from "@/hooks/use-toast"
import { useBatchProcessing } from "@/hooks/useBatchProcessing"
import { useGenerationQueue } from "@/hooks/useGenerationQueue"
import { type HistoryImage, useImageHistory } from "@/hooks/useImageHistory"
import { useSettings } from "@/hooks/useSettings"
import type { AppError, ErrorType } from "@/types/error"
import { createAppError } from "@/types/error"
import type { ControlNetConfig, GeneratedImage, LoRAConfig } from "@/types/generation"

type GenerateParams = {
  prompt: string
  negative_prompt: string
  width?: number
  height?: number
  strength?: number
  steps: number
  guidance_scale: number
  seed: number | null
  num_images: number
  model_id?: string
  lora?: LoRAConfig
  controlnet?: ControlNetConfig
}

const PROGRESS_UPDATE_INTERVAL = 100
const ESTIMATED_GENERATION_TIME = 15000

/**
 * エラーメッセージからエラータイプを推定
 */
const inferErrorType = (error: Error): ErrorType => {
  const message = error.message.toLowerCase()
  if (message.includes("network") || message.includes("failed to fetch")) return "network"
  if (message.includes("timeout") || message.includes("timed out")) return "timeout"
  if (message.includes("aborted")) return "timeout"
  return "api"
}

/**
 * エラータイプに対応するタイトルを取得
 */
const getErrorTitle = (type: ErrorType): string => {
  const titles: Record<ErrorType, string> = {
    network: "Network Error",
    api: "API Error",
    timeout: "Timeout Error",
    validation: "Validation Error",
    unknown: "Error",
  }
  return titles[type]
}

/**
 * タイムスタンプをフォーマット
 */
const formatTimestamp = (date: Date): string =>
  new Date(date).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })

/**
 * メインページコンポーネント
 */
export default function Home(): React.ReactNode {
  const [mode, setMode] = useState<"txt2img" | "img2img">("img2img")
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showErrorLog, setShowErrorLog] = useState(false)
  const [lastParams, setLastParams] = useState<GenerateParams | null>(null)
  const [sidebarTab, setSidebarTab] = useState<"generate" | "batch">("generate")

  const { history, addImages, clearHistory, removeImage } = useImageHistory()
  const {
    settings,
    updateSettings,
    resetSettings,
    customPresets,
    savePreset,
    deletePreset,
    applyPreset,
  } = useSettings()

  const {
    queueItems,
    isAutoRunning,
    isProcessing,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    clearCompleted,
    toggleAutoRun,
    processQueue,
  } = useGenerationQueue()

  const {
    batchItems,
    currentIndex,
    isRunning: isBatchRunning,
    isPaused: isBatchPaused,
    startBatch,
    stopBatch,
    pauseBatch,
    resumeBatch,
  } = useBatchProcessing()

  const { toasts, toast, dismiss } = useToast()
  const {
    errorLog,
    currentError,
    handleError,
    clearCurrentError,
    clearErrorLog,
    markErrorAsResolved,
  } = useErrorHandler()

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / ESTIMATED_GENERATION_TIME) * 95, 95)
      setProgress(newProgress)
    }, PROGRESS_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [isGenerating])

  const handleImageGenerated = useCallback(
    (image: GeneratedImage) => {
      const historyImage: HistoryImage = {
        id: image.id,
        image: image.image,
        prompt: image.prompt,
        mode: image.mode,
        timestamp: image.timestamp,
      }
      addImages([historyImage])
    },
    [addImages],
  )

  useEffect(() => {
    if (isAutoRunning && !isProcessing) {
      const hasPending = queueItems.some((item) => item.status === "pending")
      if (hasPending) {
        processQueue(handleImageGenerated)
      }
    }
  }, [isAutoRunning, isProcessing, queueItems, processQueue, handleImageGenerated])

  const showErrorToast = useCallback(
    (appError: AppError): void => {
      toast({
        title: getErrorTitle(appError.type),
        description: appError.message,
        variant: "destructive",
        duration: 8000,
      })
    },
    [toast],
  )

  const handleGenerate = useCallback(
    async (params: GenerateParams): Promise<void> => {
      setIsGenerating(true)
      setProgress(0)
      clearCurrentError()
      setLastParams(params)

      try {
        const endpoint = mode === "img2img" ? "/api/generate/img2img" : "/api/generate/txt2img"
        const requestBody = mode === "img2img" ? { ...params, init_image: inputImage } : params

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000)

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data = await response.json()

        if (!response.ok) {
          const errorMessage = data.error || "Generation failed"
          throw new Error(errorMessage)
        }

        setProgress(100)

        const newImages: HistoryImage[] = data.images.map((img: string, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          image: img,
          prompt: params.prompt,
          mode,
          timestamp: new Date().toISOString(),
        }))

        addImages(newImages)

        toast({
          title: "Generation Complete",
          description: `${data.images.length} image(s) generated successfully`,
          variant: "success",
          duration: 3000,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error("An unknown error occurred")
        const errorType = inferErrorType(error)
        const appError = createAppError(error, { type: errorType })
        handleError(appError)
        showErrorToast(appError)
      } finally {
        setIsGenerating(false)
      }
    },
    [mode, inputImage, addImages, clearCurrentError, handleError, showErrorToast, toast],
  )

  const handleRetry = useCallback((): void => {
    if (lastParams) {
      if (currentError) {
        markErrorAsResolved(currentError.id)
      }
      handleGenerate(lastParams)
    }
  }, [lastParams, currentError, markErrorAsResolved, handleGenerate])

  const handleUseAsInput = useCallback((imageBase64: string): void => {
    setInputImage(imageBase64)
    setMode("img2img")
  }, [])

  const handleAddToQueue = useCallback((): void => {
    if (!settings.prompt.trim()) return

    const params: GenerateParams = {
      prompt: settings.prompt.trim(),
      negative_prompt: settings.negativePrompt.trim(),
      steps: settings.steps,
      guidance_scale: settings.guidanceScale,
      seed: settings.seed ? Number.parseInt(settings.seed, 10) : null,
      num_images: settings.numImages,
      model_id: settings.modelId,
    }

    if (settings.lora.enabled && settings.lora.modelPath) {
      params.lora = settings.lora
    }

    if (settings.controlnet.enabled && settings.controlnet.modelName) {
      params.controlnet = settings.controlnet
    }

    if (mode === "txt2img") {
      params.width = settings.width
      params.height = settings.height
    } else {
      params.strength = settings.strength
    }

    addToQueue(params, mode, inputImage || undefined)
  }, [settings, mode, inputImage, addToQueue])

  const handleStartBatch = useCallback(
    (prompts: string[]): void => {
      const baseParams = {
        negative_prompt: settings.negativePrompt.trim(),
        steps: settings.steps,
        guidance_scale: settings.guidanceScale,
        seed: null,
        num_images: settings.numImages,
        model_id: settings.modelId,
        width: settings.width,
        height: settings.height,
        strength: settings.strength,
      }

      startBatch(prompts, baseParams, mode, inputImage || undefined, handleImageGenerated)
    },
    [settings, mode, inputImage, startBatch, handleImageGenerated],
  )

  const unresolvedErrors = errorLog.filter((e) => !e.resolved)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <h1 className="text-xl font-semibold">Stable Diffusion WebUI</h1>
        <div className="flex items-center gap-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList>
              <TabsTrigger value="img2img">img2img</TabsTrigger>
              <TabsTrigger value="txt2img">txt2img</TabsTrigger>
            </TabsList>
          </Tabs>
          <ThemeToggle />
        </div>
      </header>

      {isGenerating && (
        <div className="border-b bg-card px-6 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Generating...</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <main className="flex flex-1">
        <aside className="flex w-[420px] flex-col gap-5 overflow-y-auto border-r bg-card p-5">
          {mode === "img2img" && (
            <ImageUploader currentImage={inputImage} onImageSelect={setInputImage} />
          )}

          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as typeof sidebarTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="generate" className="flex-1">
                Generate
              </TabsTrigger>
              <TabsTrigger value="batch" className="flex-1">
                Batch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-4 space-y-4">
              <ParameterPanel
                mode={mode}
                onGenerate={handleGenerate}
                isGenerating={isGenerating || isProcessing}
                hasInputImage={!!inputImage}
                settings={settings}
                updateSettings={updateSettings}
                resetSettings={resetSettings}
                customPresets={customPresets}
                savePreset={savePreset}
                deletePreset={deletePreset}
                applyPreset={applyPreset}
              />
            </TabsContent>

            <TabsContent value="batch" className="mt-4 space-y-4">
              <BatchInput
                onStartBatch={handleStartBatch}
                onStopBatch={stopBatch}
                onPauseBatch={pauseBatch}
                onResumeBatch={resumeBatch}
                isRunning={isBatchRunning}
                isPaused={isBatchPaused}
                batchItems={batchItems}
                currentIndex={currentIndex}
              />
            </TabsContent>
          </Tabs>

          <QueuePanel
            items={queueItems}
            isAutoRunning={isAutoRunning}
            onToggleAutoRun={toggleAutoRun}
            onRemoveItem={removeFromQueue}
            onMoveItem={moveInQueue}
            onClearCompleted={clearCompleted}
            onAddCurrentToQueue={handleAddToQueue}
          />

          {currentError && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="mb-2 flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">{getErrorTitle(currentError.type)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentError.message}</p>
                  {currentError.details && currentError.details !== currentError.message && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Details: {currentError.details}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {currentError.retryable && lastParams && (
                  <Button variant="outline" size="sm" onClick={handleRetry} disabled={isGenerating}>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Retry
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    markErrorAsResolved(currentError.id)
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {unresolvedErrors.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm"
                onClick={() => setShowErrorLog(!showErrorLog)}
              >
                <span className="font-medium">Error Log ({unresolvedErrors.length})</span>
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
                        <span className="text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{entry.message}</p>
                    </div>
                  ))}
                  {unresolvedErrors.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground">
                      +{unresolvedErrors.length - 5} more errors
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearErrorLog}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Clear Log
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="flex-1 overflow-y-auto p-5">
          <GeneratedImages
            images={history}
            onUseAsInput={handleUseAsInput}
            onClearHistory={clearHistory}
            onRemoveImage={removeImage}
          />
        </section>
      </main>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
