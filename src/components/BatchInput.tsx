"use client"

import { Pause, Play, RotateCcw, Square } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BatchItem } from "@/types/generation"

type BatchInputProps = {
  onStartBatch: (prompts: string[]) => void
  onStopBatch: () => void
  onPauseBatch: () => void
  onResumeBatch: () => void
  isRunning: boolean
  isPaused: boolean
  batchItems: BatchItem[]
  currentIndex: number
}

export const BatchInput = ({
  onStartBatch,
  onStopBatch,
  onPauseBatch,
  onResumeBatch,
  isRunning,
  isPaused,
  batchItems,
  currentIndex,
}: BatchInputProps): React.ReactNode => {
  const [batchText, setBatchText] = useState("")

  const handleStart = (): void => {
    const prompts = batchText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (prompts.length === 0) return

    onStartBatch(prompts)
  }

  const handleReset = (): void => {
    setBatchText("")
    onStopBatch()
  }

  const completedCount = batchItems.filter((item) => item.status === "completed").length
  const errorCount = batchItems.filter((item) => item.status === "error").length
  const totalCount = batchItems.length

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Batch Processing</Label>
        {isRunning && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} ({progressPercent}%)
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Enter prompts (one per line)</Label>
        <Textarea
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          placeholder="a beautiful sunset over mountains&#10;a cyberpunk city at night&#10;a serene forest with a river"
          rows={5}
          disabled={isRunning}
        />
      </div>

      {isRunning && totalCount > 0 && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Processing: {currentIndex + 1} of {totalCount}
            </span>
            {errorCount > 0 && <span className="text-destructive">{errorCount} errors</span>}
          </div>
        </div>
      )}

      {isRunning && batchItems.length > 0 && (
        <div className="max-h-[150px] space-y-1 overflow-y-auto rounded border bg-muted/30 p-2">
          {batchItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                index === currentIndex ? "bg-primary/20" : ""
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  item.status === "completed"
                    ? "bg-green-500"
                    : item.status === "error"
                      ? "bg-red-500"
                      : item.status === "processing"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-muted-foreground"
                }`}
              />
              <span className="truncate">{item.prompt}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            type="button"
            className="flex-1"
            onClick={handleStart}
            disabled={!batchText.trim()}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Batch
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button type="button" variant="default" onClick={onResumeBatch}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={onPauseBatch}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            <Button type="button" variant="destructive" onClick={onStopBatch}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </>
        )}
        <Button type="button" variant="outline" size="icon" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
