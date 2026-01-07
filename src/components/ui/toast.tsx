"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500 bg-green-500/10 text-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof toastVariants> & {
    onClose?: () => void
  }

/**
 * トーストコンポーネント
 */
const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, onClose, children, ...props }, ref): React.ReactNode => (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      data-state="open"
      {...props}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          className="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  ),
)
Toast.displayName = "Toast"

type ToastTitleProps = React.HTMLAttributes<HTMLDivElement>

/**
 * トーストタイトルコンポーネント
 */
const ToastTitle = React.forwardRef<HTMLDivElement, ToastTitleProps>(
  ({ className, ...props }, ref): React.ReactNode => (
    <div ref={ref} className={cn("text-sm font-semibold [&+div]:text-xs", className)} {...props} />
  ),
)
ToastTitle.displayName = "ToastTitle"

type ToastDescriptionProps = React.HTMLAttributes<HTMLDivElement>

/**
 * トースト説明コンポーネント
 */
const ToastDescription = React.forwardRef<HTMLDivElement, ToastDescriptionProps>(
  ({ className, ...props }, ref): React.ReactNode => (
    <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
  ),
)
ToastDescription.displayName = "ToastDescription"

type ToastActionProps = React.ButtonHTMLAttributes<HTMLButtonElement>

/**
 * トーストアクションボタンコンポーネント
 */
const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  ({ className, ...props }, ref): React.ReactNode => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
ToastAction.displayName = "ToastAction"

export { Toast, ToastTitle, ToastDescription, ToastAction, toastVariants }
