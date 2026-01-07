"use client"

import { useCallback, useState } from "react"
import { type AppError, createAppError, type ErrorLogEntry } from "@/types/error"

const MAX_ERROR_LOG_SIZE = 50

/**
 * エラーハンドリングを管理するカスタムフック
 */
export const useErrorHandler = (): {
  errorLog: ErrorLogEntry[]
  currentError: AppError | null
  handleError: (error: Error | AppError, customMessage?: string) => AppError
  clearCurrentError: () => void
  clearErrorLog: () => void
  markErrorAsResolved: (errorId: string) => void
  getErrorsByType: (type: AppError["type"]) => ErrorLogEntry[]
} => {
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([])
  const [currentError, setCurrentError] = useState<AppError | null>(null)

  const handleError = useCallback((error: Error | AppError, customMessage?: string): AppError => {
    const appError: AppError =
      "type" in error && "retryable" in error
        ? error
        : createAppError(error as Error, {
            message: customMessage,
          })

    setCurrentError(appError)

    setErrorLog((prev) => {
      const newLog: ErrorLogEntry[] = [{ ...appError, resolved: false }, ...prev].slice(
        0,
        MAX_ERROR_LOG_SIZE,
      )
      return newLog
    })

    return appError
  }, [])

  const clearCurrentError = useCallback((): void => {
    setCurrentError(null)
  }, [])

  const clearErrorLog = useCallback((): void => {
    setErrorLog([])
  }, [])

  const markErrorAsResolved = useCallback((errorId: string): void => {
    setErrorLog((prev) =>
      prev.map((entry) => (entry.id === errorId ? { ...entry, resolved: true } : entry)),
    )
    setCurrentError((prev) => (prev?.id === errorId ? null : prev))
  }, [])

  const getErrorsByType = useCallback(
    (type: AppError["type"]): ErrorLogEntry[] => errorLog.filter((entry) => entry.type === type),
    [errorLog],
  )

  return {
    errorLog,
    currentError,
    handleError,
    clearCurrentError,
    clearErrorLog,
    markErrorAsResolved,
    getErrorsByType,
  }
}
