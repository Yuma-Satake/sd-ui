"use client"

import { useCallback, useState } from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

export type ToastVariant = "default" | "destructive" | "success"

export type Toast = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  action?: React.ReactNode
  duration?: number
}

type ToastState = {
  toasts: Toast[]
}

/**
 * トースト通知を管理するカスタムフック
 */
export const useToast = (): {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => string
  dismiss: (toastId?: string) => void
  dismissAll: () => void
} => {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback((props: Omit<Toast, "id">): string => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const duration = props.duration ?? TOAST_REMOVE_DELAY

    setState((prev) => {
      const newToasts = [{ ...props, id }, ...prev.toasts].slice(0, TOAST_LIMIT)
      return { toasts: newToasts }
    })

    if (duration > 0) {
      setTimeout(() => {
        setState((prev) => ({
          toasts: prev.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }

    return id
  }, [])

  const dismiss = useCallback((toastId?: string): void => {
    setState((prev) => ({
      toasts: toastId ? prev.toasts.filter((t) => t.id !== toastId) : prev.toasts.slice(1),
    }))
  }, [])

  const dismissAll = useCallback((): void => {
    setState({ toasts: [] })
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    dismissAll,
  }
}
