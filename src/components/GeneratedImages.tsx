"use client"

import { Copy, Download, ImageIcon, Sprout, Trash2, Upload, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { HistoryImage } from "@/hooks/useImageHistory"

type GeneratedImagesProps = {
  images: HistoryImage[]
  onUseAsInput: (imageUrl: string) => void
  onClearHistory: () => void
  onRemoveImage: (id: string) => void
  onReuseSeed: (seed: number) => void
}

/**
 * 生成された画像のギャラリーコンポーネント
 */
export const GeneratedImages = ({
  images,
  onUseAsInput,
  onClearHistory,
  onRemoveImage,
  onReuseSeed,
}: GeneratedImagesProps): React.ReactNode => {
  const [selectedImage, setSelectedImage] = useState<HistoryImage | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleDownload = (imageUrl: string, index: number): void => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `generated-${Date.now()}-${index}.png`
    link.click()
  }

  const handleCopyPrompt = async (prompt: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch (err) {
      console.error("Failed to copy prompt:", err)
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {images.map((item, index) => (
          <Card key={item.id} className="group relative overflow-hidden">
            <img
              src={item.image}
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
                onClick={() => handleCopyPrompt(item.prompt)}
                title="Copy prompt"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/70 hover:bg-black/90"
                onClick={() => onReuseSeed(item.seed)}
                title={`このseedを使う (${item.seed})`}
              >
                <Sprout className="h-4 w-4" />
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
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
                  {item.mode}
                </span>
                <span
                  className="truncate font-mono text-xs text-muted-foreground"
                  title={`seed: ${item.seed}`}
                >
                  seed: {item.seed}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground" title={item.prompt}>
                {item.prompt}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
          onClick={() => setSelectedImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedImage(null)
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-4 top-4 z-10"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <img
              src={selectedImage.image}
              alt={selectedImage.prompt}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div
            className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-3 rounded-lg bg-card/95 p-3 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="presentation"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p
                className="line-clamp-2 max-w-[40vw] text-sm text-muted-foreground"
                title={selectedImage.prompt}
              >
                {selectedImage.prompt}
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                seed: {selectedImage.seed}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onUseAsInput(selectedImage.image)
                  setSelectedImage(null)
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                入力にする
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(selectedImage.image, 0)}
              >
                <Download className="mr-2 h-4 w-4" />
                保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyPrompt(selectedImage.prompt)}
              >
                <Copy className="mr-2 h-4 w-4" />
                プロンプトをコピー
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onReuseSeed(selectedImage.seed)
                }}
              >
                <Sprout className="mr-2 h-4 w-4" />
                このseedを使う
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onRemoveImage(selectedImage.id)
                  setSelectedImage(null)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
