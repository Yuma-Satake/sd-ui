"use client"

import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { QueueItem } from "@/types/generation"

type QueuePanelProps = {
  items: QueueItem[]
  onRemoveItem: (id: string) => void
  onMoveItem: (id: string, direction: "up" | "down") => void
}

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  pending: "順番待ち",
  processing: "生成中",
  error: "エラー",
}

const STATUS_COLOR: Record<QueueItem["status"], string> = {
  pending: "bg-muted-foreground",
  processing: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
}

export const QueuePanel = ({
  items,
  onRemoveItem,
  onMoveItem,
}: QueuePanelProps): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState(true)

  if (items.length === 0) return null

  const pendingCount = items.filter((item) => item.status === "pending").length
  const processingCount = items.filter((item) => item.status === "processing").length

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-muted/50 p-3 text-left hover:bg-muted"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">生成待ち</span>
          {pendingCount > 0 && (
            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
              {pendingCount}件
            </span>
          )}
          {processingCount > 0 && (
            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-600">
              生成中
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
                    <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[item.status]}`} />
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{item.params.prompt}</p>
                  {item.error && <p className="text-xs text-destructive">{item.error}</p>}
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
        </div>
      )}
    </Card>
  )
}
