"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ProgressProps = {
  value?: number
  max?: number
  className?: string
  indicatorClassName?: string
  indeterminate?: boolean
}

/**
 * プログレスバーコンポーネント
 * 進捗状況を視覚的に表示
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    { className, value = 0, max = 100, indicatorClassName, indeterminate = false, ...props },
    ref,
  ): React.ReactNode => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
        {...props}
      >
        <div
          className={cn(
            "h-full bg-primary transition-all duration-300 ease-in-out",
            indeterminate && "animate-progress-indeterminate",
            indicatorClassName,
          )}
          style={{
            width: indeterminate ? "50%" : `${percentage}%`,
          }}
        />
      </div>
    )
  },
)
Progress.displayName = "Progress"

export { Progress }
