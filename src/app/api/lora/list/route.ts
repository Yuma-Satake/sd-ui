import { spawn } from "node:child_process"
import path from "node:path"
import { NextResponse } from "next/server"

const PYTHON_SCRIPT = path.join(process.cwd(), "python", "generator.py")

type LoRAListResult = {
  loras: Array<{
    name: string
    path: string
  }>
}

const runPython = (command: string): Promise<LoRAListResult> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("uv", ["run", "python3", PYTHON_SCRIPT, command], {
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
  })
}

export const GET = async (): Promise<NextResponse> => {
  try {
    const result = await runPython("list_loras")
    return NextResponse.json(result)
  } catch (error) {
    console.error("LoRA list error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
