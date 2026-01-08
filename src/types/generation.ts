export type GenerationMode = "txt2img" | "img2img"

export type QueueItemStatus = "pending" | "processing" | "completed" | "error"

export type SamplerType =
  | "dpm++_2m"
  | "dpm++_2m_karras"
  | "dpm++_sde"
  | "dpm++_sde_karras"
  | "euler"
  | "euler_a"
  | "ddim"
  | "pndm"
  | "lms"
  | "heun"
  | "dpm2"
  | "dpm2_a"
  | "unipc"

export type SamplerInfo = {
  id: SamplerType
  name: string
}

export type ModelInfo = {
  id: string
  name: string
  path: string
}

export type LoRAConfig = {
  enabled: boolean
  modelPath: string
  weight: number
}

export type ControlNetConfig = {
  enabled: boolean
  modelName: string
  controlImage: string | null
  weight: number
  guidanceStart: number
  guidanceEnd: number
}

export type GenerateParams = {
  prompt: string
  negative_prompt: string
  width?: number
  height?: number
  strength?: number
  steps: number
  guidance_scale: number
  seed: number | null
  num_images: number
  model_id?: string
  sampler?: SamplerType
  lora?: LoRAConfig
  controlnet?: ControlNetConfig
}

export type BatchItem = {
  id: string
  prompt: string
  negative_prompt: string
  status: QueueItemStatus
}

export type QueueItem = {
  id: string
  params: GenerateParams
  mode: GenerationMode
  inputImage?: string
  status: QueueItemStatus
  progress?: number
  result?: string[]
  error?: string
  createdAt: string
}

export type GeneratedImage = {
  id: string
  image: string
  prompt: string
  mode: string
  timestamp: string
}
