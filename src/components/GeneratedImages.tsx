"use client"

import { Copy, Download, ImageIcon, Trash2, Upload, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { HistoryImage } from "@/hooks/useImageHistory"

type GeneratedImagesProps = {
  images: HistoryImage[]
  onUseAsInput: (imageBase64: string) => void
  onClearHistory: () => void
  onRemoveImage: (id: string) => void
}

/**
 * 生成された画像のギャラリーコンポーネント
 */
export const GeneratedImages = ({
  images,
  onUseAsInput,
  onClearHistory,
  onRemoveImage,
}: GeneratedImagesProps): React.ReactNode => {
  const [selectedImage, setSelectedImage] = useState<HistoryImage | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleDownload = (imageBase64: string, index: number): void => {
    const link = document.createElement("a")
    link.href = `data:image/png;base64,${imageBase64}`
    link.download = `generated-${Date.now()}-${index}.png`
    link.click()
  }

  const handleCopyToClipboard = async (imageBase64: string): Promise<void> => {
    try {
      const response = await fetch(`data:image/png;base64,${imageBase64}`)
      const blob = await response.blob()
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
    } catch (err) {
      console.error("Failed to copy image:", err)
    }
  }

  const handleClearHistory = (): void => {
    onClearHistory()
    setShowClearConfirm(false)
  }

  if (images.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-muted-foreground">
        <ImageIcon className="h-16 w-16 opacity-30" />
        <p>Generated images will appear here</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {images.length} image{images.length !== 1 ? "s" : ""} in history
        </span>
        {showClearConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Clear all?</span>
            <Button variant="destructive" size="sm" onClick={handleClearHistory}>
              Yes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>
              No
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear History
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((item, index) => (
          <Card key={item.id} className="group relative overflow-hidden">
            <img
              src={`data:image/png;base64,${item.image}`}
              alt={item.prompt}
              className="aspect-square w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
              onClick={() => setSelectedImage(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedImage(item)
              }}
            />
            <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/70 hover:bg-black/90"
                onClick={() => onUseAsInput(item.image)}
                title="Use as input"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/70 hover:bg-black/90"
                onClick={() => handleDownload(item.image, index)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/70 hover:bg-black/90"
                onClick={() => handleCopyToClipboard(item.image)}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/70 hover:bg-destructive"
                onClick={() => onRemoveImage(item.id)}
                title="Remove from history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3">
              <span className="mb-1 inline-block rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
                {item.mode}
              </span>
              <p className="truncate text-sm text-muted-foreground" title={item.prompt}>
                {item.prompt}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-10"
          onClick={() => setSelectedImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedImage(null)
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-card"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="document"
          >
            <Button
              variant="destructive"
              size="icon"
              className="absolute right-3 top-3 z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={`data:image/png;base64,${selectedImage.image}`}
              alt={selectedImage.prompt}
              className="max-h-[70vh] w-auto"
            />
            <div className="p-5">
              <p className="mb-4 text-sm">{selectedImage.prompt}</p>
              <div className="flex gap-3">
                <Button onClick={() => onUseAsInput(selectedImage.image)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Use as Input
                </Button>
                <Button variant="outline" onClick={() => handleDownload(selectedImage.image, 0)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCopyToClipboard(selectedImage.image)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    onRemoveImage(selectedImage.id)
                    setSelectedImage(null)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
