import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const OUTPUT_DIR = path.join(process.cwd(), "public", "generated")

export const saveGeneratedImages = async (jobId: string, images: string[]): Promise<string[]> => {
  await mkdir(OUTPUT_DIR, { recursive: true })
  return Promise.all(
    images.map(async (base64, index) => {
      const filename = `${jobId}-${index}.png`
      await writeFile(path.join(OUTPUT_DIR, filename), Buffer.from(base64, "base64"))
      return `/generated/${filename}`
    }),
  )
}
