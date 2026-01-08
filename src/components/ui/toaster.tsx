"use client"

import { AlertCircle, CheckCircle, Info } from "lucide-react"
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast"
import type { Toast as ToastType, ToastVariant } from "@/hooks/use-toast"

type ToasterProps = {
  toasts: ToastType[]
  onDismiss: (id: string) => void
}

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-5 w-5" />,
  destructive: <AlertCircle className="h-5 w-5" />,
  success: <CheckCircle className="h-5 w-5" />,
}

/**
 * トースター（トースト通知コンテナ）コンポーネント
 */
export const Toaster = ({ toasts, onDismiss }: ToasterProps): React.ReactNode => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} variant={toast.variant} onClose={() => onDismiss(toast.id)}>
          <div className="flex items-start gap-3">
            {VARIANT_ICONS[toast.variant ?? "default"]}
            <div className="flex-1">
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            </div>
            {toast.action}
          </div>
        </Toast>
      ))}
    </div>
  )
}
