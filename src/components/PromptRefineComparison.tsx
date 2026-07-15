"use client"

import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { LoopState } from "@/hooks/usePromptRefineLoop"

type PromptRefineComparisonProps = {
  loop: LoopState | null
  onSelect: (index: 0 | 1) => void
  onRetry: (index: 0 | 1) => void
}

const LABELS = ["A", "B"] as const

export const PromptRefineComparison = ({
  loop,
  onSelect,
  onRetry,
}: PromptRefineComparisonProps): React.ReactNode => {
  if (!loop) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-16 w-16 opacity-30" />
        <p>プロンプトを入力して「改善候補を生成する」を押してください</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {loop.candidates.map((candidate, index) => (
        <Card key={candidate.tag} className="flex flex-col overflow-hidden">
          <div className="flex aspect-square w-full items-center justify-center bg-muted">
            {candidate.status === "completed" && candidate.image ? (
              <img
                src={candidate.image}
                alt={candidate.prompt}
                className="h-full w-full object-cover"
              />
            ) : candidate.status === "error" ? (
              <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-destructive">
                <p>{candidate.error ?? "生成に失敗しました"}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(index as 0 | 1)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  リトライ
                </Button>
              </div>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
                案 {LABELS[index]}
              </span>
            </div>
            <p className="line-clamp-4 text-sm text-muted-foreground">{candidate.prompt}</p>
            <Button
              type="button"
              className="mt-auto w-full"
              disabled={candidate.status !== "completed"}
              onClick={() => onSelect(index as 0 | 1)}
            >
              この案を選ぶ
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
