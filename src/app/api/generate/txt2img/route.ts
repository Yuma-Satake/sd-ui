import { spawn } from "node:child_process"
import path from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { saveGeneratedImages } from "@/lib/imageStorage"
import { jobStore } from "@/lib/jobStore"

const PYTHON_SCRIPT = path.join(process.cwd(), "python", "generator.py")

type LoRAConfig = {
  enabled: boolean
  modelPath: string
  weight: number
}

type ControlNetConfig = {
  enabled: boolean
  modelName: string
  controlImage: string | null
  weight: number
  guidanceStart: number
  guidanceEnd: number
}

type Txt2ImgParams = {
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  steps?: number
  guidance_scale?: number
  seed?: number | null
  num_images?: number
  model_id?: string
  lora?: LoRAConfig
  controlnet?: ControlNetConfig
  sampler?: string
}

/**
 * Pythonスクリプトをバックグラウンドで実行し、結果をjobStoreに保存する
 */
const runPythonInBackground = (jobId: string, command: string, input: Txt2ImgParams): void => {
  jobStore.setProcessing(jobId)

  const proc = spawn("uv", ["run", "python3", PYTHON_SCRIPT, command], {
    stdio: ["pipe", "pipe", "pipe"],
  })

  let stdout = ""
  let stderr = ""

  proc.stdout.on("data", (data) => {
    stdout += data.toString()
  })

  proc.stderr.on("data", (data) => {
    const msg = data.toString()
    stderr += msg
    for (const line of msg.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed.type === "progress") {
          jobStore.setProgress(jobId, parsed.progress)
        }
      } catch {
        console.log("[Python]", trimmed)
      }
    }
  })

  proc.on("close", async (code) => {
    if (code !== 0) {
      jobStore.setFailed(jobId, stderr || `Process exited with code ${code}`)
      return
    }
    try {
      const result = JSON.parse(stdout)
      if (result.error) {
        jobStore.setFailed(jobId, result.error)
        return
      }
      const urls = await saveGeneratedImages(jobId, result.images)
      const seeds: number[] = Array.isArray(result.seeds) ? result.seeds : []
      jobStore.setCompleted(jobId, { images: urls, seeds })
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to parse output: ${stdout}`
      jobStore.setFailed(jobId, message)
    }
  })

  proc.on("error", (error) => {
    jobStore.setFailed(jobId, error.message)
  })

  proc.stdin.write(JSON.stringify(input))
  proc.stdin.end()
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = await request.json()

    const {
      prompt,
      negative_prompt,
      width,
      height,
      steps,
      guidance_scale,
      seed,
      num_images,
      model_id,
      lora,
      controlnet,
      sampler,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const params: Txt2ImgParams = {
      prompt,
      negative_prompt: negative_prompt || "",
      width: width || 512,
      height: height || 512,
      steps: steps || 30,
      guidance_scale: guidance_scale || 7.5,
      seed: seed || null,
      num_images: num_images || 1,
    }

    if (model_id) {
      params.model_id = model_id
    }

    if (lora) {
      params.lora = lora
    }

    if (controlnet) {
      params.controlnet = controlnet
    }

    if (sampler) {
      params.sampler = sampler
    }

    const jobId = `txt2img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    jobStore.create(jobId)

    runPythonInBackground(jobId, "txt2img", params)

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("txt2img error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
