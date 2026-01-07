"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUploader } from "@/components/ImageUploader"
import { ParameterPanel } from "@/components/ParameterPanel"
import { GeneratedImages } from "@/components/GeneratedImages"

interface GeneratedImage {
  id: string
  image: string
  prompt: string
  mode: string
  timestamp: string
}

interface GenerateParams {
  prompt: string
  negative_prompt: string
  width?: number
  height?: number
  strength?: number
  steps: number
  guidance_scale: number
  seed: number | null
  num_images: number
}

export default function Home() {
  const [mode, setMode] = useState<"txt2img" | "img2img">("img2img")
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(
    async (params: GenerateParams) => {
      setIsGenerating(true)
      setError(null)

      try {
        const endpoint = mode === "img2img" ? "/api/generate/img2img" : "/api/generate/txt2img"

        const requestBody =
          mode === "img2img" ? { ...params, init_image: inputImage } : params

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Generation failed")
        }

        setGeneratedImages((prev) => [
          ...data.images.map((img: string, idx: number) => ({
            id: `${Date.now()}-${idx}`,
            image: img,
            prompt: params.prompt,
            mode,
            timestamp: new Date().toISOString(),
          })),
          ...prev,
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsGenerating(false)
      }
    },
    [mode, inputImage]
  )

  const handleUseAsInput = useCallback((imageBase64: string) => {
    setInputImage(imageBase64)
    setMode("img2img")
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <h1 className="text-xl font-semibold">Stable Diffusion WebUI</h1>
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="img2img">img2img</TabsTrigger>
            <TabsTrigger value="txt2img">txt2img</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="flex flex-1">
        <aside className="flex w-[380px] flex-col gap-5 overflow-y-auto border-r bg-card p-5">
          {mode === "img2img" && (
            <ImageUploader currentImage={inputImage} onImageSelect={setInputImage} />
          )}
          <ParameterPanel
            mode={mode}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            hasInputImage={!!inputImage}
          />
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </aside>

        <section className="flex-1 overflow-y-auto p-5">
          <GeneratedImages images={generatedImages} onUseAsInput={handleUseAsInput} />
        </section>
      </main>
    </div>
  )
}
