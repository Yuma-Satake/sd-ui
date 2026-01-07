"use client"

import { ChevronDown, ChevronUp, GripVertical, Pause, Play, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { QueueItem } from "@/types/generation"

type QueuePanelProps = {
  items: QueueItem[]
  isAutoRunning: boolean
  onToggleAutoRun: () => void
  onRemoveItem: (id: string) => void
  onMoveItem: (id: string, direction: "up" | "down") => void
  onClearCompleted: () => void
  onAddCurrentToQueue: () => void
}

export const QueuePanel = ({
  items,
  isAutoRunning,
  onToggleAutoRun,
  onRemoveItem,
  onMoveItem,
  onClearCompleted,
  onAddCurrentToQueue,
}: QueuePanelProps): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState(true)

  const pendingCount = items.filter((item) => item.status === "pending").length
  const processingCount = items.filter((item) => item.status === "processing").length
  const completedCount = items.filter((item) => item.status === "completed").length

  const getStatusColor = (status: QueueItem["status"]): string => {
    switch (status) {
      case "pending":
        return "bg-muted-foreground"
      case "processing":
        return "bg-yellow-500 animate-pulse"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-muted-foreground"
    }
  }

  const getStatusText = (status: QueueItem["status"]): string => {
    switch (status) {
      case "pending":
        return "Pending"
      case "processing":
        return "Processing"
      case "completed":
        return "Completed"
      case "error":
        return "Error"
      default:
        return status
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-muted/50 p-3 text-left hover:bg-muted"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Generation Queue</span>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
            {pendingCount} pending
          </span>
          {processingCount > 0 && (
            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-600">
              {processingCount} running
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 p-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={isAutoRunning ? "default" : "outline"}
                onClick={onToggleAutoRun}
              >
                {isAutoRunning ? (
                  <>
                    <Pause className="mr-1 h-3 w-3" />
                    Auto: ON
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-3 w-3" />
                    Auto: OFF
                  </>
                )}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onAddCurrentToQueue}>
                <Plus className="mr-1 h-3 w-3" />
                Add to Queue
              </Button>
            </div>
            {completedCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={onClearCompleted}
              >
                Clear Completed ({completedCount})
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
              <p className="text-sm">Queue is empty</p>
              <p className="text-xs">Add items to the queue to process them automatically</p>
            </div>
          ) : (
            <div className="max-h-[300px] divide-y overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 p-3 ${
                    item.status === "processing" ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onMoveItem(item.id, "up")}
                      disabled={index === 0 || item.status !== "pending"}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onMoveItem(item.id, "down")}
                      disabled={index === items.length - 1 || item.status !== "pending"}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${getStatusColor(item.status)}`} />
                      <span className="text-xs text-muted-foreground">
                        {getStatusText(item.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.mode}</span>
                    </div>
                    <p className="line-clamp-2 text-sm">{item.params.prompt}</p>
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                    {item.progress !== undefined && item.status === "processing" && (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                    disabled={item.status === "processing"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
