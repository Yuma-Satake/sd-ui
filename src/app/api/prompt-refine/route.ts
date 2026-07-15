import { type NextRequest, NextResponse } from "next/server"
import {
  generateRefinedPrompts,
  OllamaConnectionError,
  OllamaModelNotFoundError,
} from "@/lib/ollama"

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = await request.json()
    const prompt = body.prompt

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const candidates = await generateRefinedPrompts(prompt.trim())
    return NextResponse.json({ candidates })
  } catch (error) {
    if (error instanceof OllamaConnectionError || error instanceof OllamaModelNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("prompt-refine error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
