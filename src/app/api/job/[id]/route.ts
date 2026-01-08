import { type NextRequest, NextResponse } from "next/server"
import { jobStore } from "@/lib/jobStore"

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params
  const job = jobStore.get(id)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    result: job.result,
    error: job.error,
  })
}
