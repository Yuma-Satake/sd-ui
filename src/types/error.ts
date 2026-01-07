/**
 * エラーの種類を表す型
 */
export type ErrorType = "network" | "api" | "timeout" | "validation" | "unknown"

/**
 * アプリケーションエラーの構造
 */
export type AppError = {
  id: string
  type: ErrorType
  message: string
  details?: string
  timestamp: Date
  retryable: boolean
  originalError?: Error
}

/**
 * エラーログエントリーの構造
 */
export type ErrorLogEntry = AppError & {
  resolved: boolean
}

/**
 * エラーメッセージのマッピング
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: "Network connection error. Please check your internet connection.",
  api: "API request failed. Please try again later.",
  timeout: "Request timed out. The server may be busy.",
  validation: "Invalid input. Please check your parameters.",
  unknown: "An unexpected error occurred.",
}

/**
 * エラータイプを判定する関数
 */
export const determineErrorType = (error: Error): ErrorType => {
  const message = error.message.toLowerCase()

  if (message.includes("network") || message.includes("fetch")) return "network"
  if (message.includes("timeout") || message.includes("timed out")) return "timeout"
  if (message.includes("invalid") || message.includes("validation")) return "validation"
  if (message.includes("api") || message.includes("500") || message.includes("400")) return "api"
  return "unknown"
}

/**
 * AppErrorを作成するファクトリ関数
 */
export const createAppError = (error: Error, overrides?: Partial<AppError>): AppError => {
  const type = overrides?.type ?? determineErrorType(error)

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    message: overrides?.message ?? ERROR_MESSAGES[type],
    details: error.message,
    timestamp: new Date(),
    retryable: type !== "validation",
    originalError: error,
    ...overrides,
  }
}
