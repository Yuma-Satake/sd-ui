import { spawn } from "node:child_process"
import path from "node:path"
import { type NextRequest, NextResponse } from "next/server"

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

type Img2ImgParams = {
  prompt: string
  init_image: string
  negative_prompt?: string
  strength?: number
  steps?: number
  guidance_scale?: number
  seed?: number | null
  num_images?: number
  model_id?: string
  lora?: LoRAConfig
  controlnet?: ControlNetConfig
}

async function runPython(command: string, input: Img2ImgParams): Promise<{ images: string[] }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [PYTHON_SCRIPT, command], {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`))
        return
      }
      try {
        const result = JSON.parse(stdout)
        if (result.error) {
          reject(new Error(result.error))
        } else {
          resolve(result)
        }
      } catch {
        reject(new Error(`Failed to parse output: ${stdout}`))
      }
    })

    proc.on("error", reject)

    proc.stdin.write(JSON.stringify(input))
    proc.stdin.end()
  })
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = await request.json()

    const {
      prompt,
      init_image,
      negative_prompt,
      strength,
      steps,
      guidance_scale,
      seed,
      num_images,
      model_id,
      lora,
      controlnet,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!init_image) {
      return NextResponse.json({ error: "Initial image is required" }, { status: 400 })
    }

    const params: Img2ImgParams = {
      prompt,
      init_image,
      negative_prompt: negative_prompt || "",
      strength: strength || 0.75,
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

    const result = await runPython("img2img", params)

    return NextResponse.json(result)
  } catch (error) {
    console.error("img2img error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
