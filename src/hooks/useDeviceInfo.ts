"use client"

import { useEffect, useState } from "react"

type DeviceInfo = {
  model_id: string | null
  loaded: boolean
  cuda_available: boolean
  mps_available: boolean
  device: string | null
}

type UseDeviceInfoReturn = {
  info: DeviceInfo | null
  isGpuAvailable: boolean
  isLoading: boolean
  error: string | null
}

export const useDeviceInfo = (): UseDeviceInfoReturn => {
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchInfo = async (): Promise<void> => {
      try {
        const response = await fetch("/api/model/info")
        const data = await response.json()
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setInfo(null)
        } else {
          setInfo(data)
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch device info")
        setInfo(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchInfo()

    return () => {
      cancelled = true
    }
  }, [])

  const isGpuAvailable = !!(info?.cuda_available || info?.mps_available)

  return { info, isGpuAvailable, isLoading, error }
}
