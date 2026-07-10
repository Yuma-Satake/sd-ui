type JobStatus = "pending" | "processing" | "completed" | "failed"

type JobResult = { images: string[]; seeds: number[] }

type Job = {
  id: string
  status: JobStatus
  progress?: number
  result?: JobResult
  error?: string
  createdAt: number
}

const globalForJobs = globalThis as unknown as { __sdJobs?: Map<string, Job> }
const jobs: Map<string, Job> = globalForJobs.__sdJobs ?? new Map<string, Job>()
globalForJobs.__sdJobs = jobs

export const jobStore = {
  create(id: string): Job {
    const job: Job = {
      id,
      status: "pending",
      createdAt: Date.now(),
    }
    jobs.set(id, job)
    return job
  },

  get(id: string): Job | undefined {
    return jobs.get(id)
  },

  setProcessing(id: string): void {
    const job = jobs.get(id)
    if (job) {
      job.status = "processing"
    }
  },

  setProgress(id: string, progress: number): void {
    const job = jobs.get(id)
    if (job) {
      job.progress = progress
    }
  },

  setCompleted(id: string, result: JobResult): void {
    const job = jobs.get(id)
    if (job) {
      job.status = "completed"
      job.result = result
    }
  },

  setFailed(id: string, error: string): void {
    const job = jobs.get(id)
    if (job) {
      job.status = "failed"
      job.error = error
    }
  },

  delete(id: string): void {
    jobs.delete(id)
  },

  cleanup(maxAgeMs: number = 3600000): void {
    const now = Date.now()
    for (const [id, job] of jobs) {
      if (now - job.createdAt > maxAgeMs) {
        jobs.delete(id)
      }
    }
  },
}
