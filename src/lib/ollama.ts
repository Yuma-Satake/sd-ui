const OLLAMA_HOST = "http://localhost:11434"

export const OLLAMA_MODEL = "gemma2:9b"

export class OllamaConnectionError extends Error {}
export class OllamaModelNotFoundError extends Error {}

const REFINE_SYSTEM_PROMPT = `You are an expert Stable Diffusion prompt engineer.
Given an existing image generation prompt, propose exactly 2 improved variants.
Each variant must stay close to the original intent while improving detail, composition, or style.
Respond ONLY with JSON in this exact shape, no extra text:
{"candidates": ["variant 1", "variant 2"]}`

type OllamaGenerateResponse = {
  response: string
}

const extractFirstJsonObject = (raw: string): string => {
  const start = raw.indexOf("{")
  if (start === -1) throw new Error("Ollamaの応答からJSONを抽出できませんでした")

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === "{") {
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  throw new Error("Ollamaの応答からJSONを抽出できませんでした")
}

const parseCandidates = (raw: string): [string, string] => {
  const parsed = JSON.parse(extractFirstJsonObject(raw))
  const candidates = parsed.candidates
  if (!Array.isArray(candidates) || candidates.length !== 2) {
    throw new Error("Ollamaの応答形式が不正です")
  }
  const [a, b] = candidates
  if (typeof a !== "string" || typeof b !== "string" || !a.trim() || !b.trim()) {
    throw new Error("Ollamaの応答形式が不正です")
  }
  return [a.trim(), b.trim()]
}

export const generateRefinedPrompts = async (basePrompt: string): Promise<[string, string]> => {
  let response: Response
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${REFINE_SYSTEM_PROMPT}\n\nOriginal prompt: ${basePrompt}`,
        stream: false,
        format: "json",
      }),
    })
  } catch {
    throw new OllamaConnectionError(
      "Ollamaに接続できませんでした。`ollama serve` でOllamaを起動してください",
    )
  }

  if (response.status === 404) {
    throw new OllamaModelNotFoundError(
      `モデル ${OLLAMA_MODEL} が見つかりません。\`ollama pull ${OLLAMA_MODEL}\` を実行してください`,
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Ollamaがエラーを返しました: ${text || response.statusText}`)
  }

  const data = (await response.json()) as OllamaGenerateResponse
  return parseCandidates(data.response)
}
