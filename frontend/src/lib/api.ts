const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface BucketRequestOut {
  id: number
  bucket_id: number
  method: string
  path: string
  headers: Record<string, string> | null
  body: string | null
  received_at: string
  mongo_id: string
}

export interface BucketRequestListOut {
  total: number
  requests: BucketRequestOut[]
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function apiGet<T>(path: string, ownerToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Owner-Token': ownerToken },
  })

  if (!res.ok) {
    let message = res.statusText || `Request failed with status ${res.status}`
    try {
      const body: unknown = await res.json()
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        message = body.detail
      }
    } catch {
      // response had no JSON body; fall back to statusText
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

export function listBucketRequests(publicId: string, ownerToken: string) {
  return apiGet<BucketRequestListOut>(`/buckets/${publicId}`, ownerToken)
}

export function getBucketRequest(publicId: string, requestId: number, ownerToken: string) {
  return apiGet<BucketRequestOut>(`/buckets/${publicId}/requests/${requestId}`, ownerToken)
}

export function binUrl(publicId: string): string {
  return `${API_BASE}/${publicId}`
}
