"use client"

import { Upload, X } from "lucide-react"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  currentImage: string | null
  onImageSelect: (image: string | null) => void
}

export function ImageUploader({ currentImage, onImageSelect }: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(",")[1]
        onImageSelect(base64)
      }
      reader.readAsDataURL(file)
    },
    [onImageSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
  })

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onImageSelect(null)
  }

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              const base64 = result.split(",")[1]
              onImageSelect(base64)
            }
            reader.readAsDataURL(file)
          }
          break
        }
      }
    },
    [onImageSelect],
  )

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Input Image</label>
      <div
        {...getRootProps()}
        onPaste={handlePaste}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          currentImage && "border-solid p-2",
        )}
      >
        <input {...getInputProps()} />
        {currentImage ? (
          <div className="relative w-full">
            <img
              src={`data:image/png;base64,${currentImage}`}
              alt="Input"
              className="max-h-[300px] w-full rounded-md object-contain"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
            <Upload className="h-10 w-10 opacity-50" />
            <p className="text-sm">
              {isDragActive ? "Drop image here" : "Drag & drop or click to select"}
            </p>
            <p className="text-xs opacity-70">You can also paste from clipboard</p>
          </div>
        )}
      </div>
    </div>
  )
}
