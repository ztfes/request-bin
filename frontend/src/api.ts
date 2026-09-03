/**
 * Shared client for the FastAPI backend.
 *
 * Everything that talks to the backend should go through this module so the
 * base URL, the auth header and the response shapes are defined once rather
 * than re-invented in each view.
 */

/** Backend origin, configurable per environment via VITE_API_URL. */
export const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

/** Mirrors backend BucketOut. */
export interface Bucket {
  bucket_id: number
  public_id: string
  owner_token: string
  created_at: string
  last_visit_at: string
}

/** Mirrors backend BucketRequestOut. */
export interface BucketRequest {
  id: number
  bucket_id: number
  method: string
  path: string
  headers: Record<string, string> | null
  body: string | null
  received_at: string
  mongo_id: string
}

/** Mirrors backend BucketRequestListOut. */
export interface BucketRequestList {
  total: number
  requests: BucketRequest[]
}

/** A non-2xx response. Carries the status so callers can tell 403 from 404. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// FastAPI turns the `owner_token` header parameter into `owner-token`, so the
// hyphen is required -- sending `owner_token` is rejected with a 422.
function ownerTokenHeader(ownerToken: string): HeadersInit {
  return { 'owner-token': ownerToken }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.detail ?? response.statusText)
  }
  return (await response.json()) as T
}

/**
 * Create a new bucket. The returned `owner_token` is the only copy the backend
 * hands out -- callers must persist it or the bucket becomes unreadable.
 */
export function createBucket(): Promise<Bucket> {
  return request<Bucket>('/buckets', { method: 'POST' })
}

/** List every request captured by a bucket, oldest first. */
export function listRequests(publicId: string, ownerToken: string): Promise<BucketRequestList> {
  return request<BucketRequestList>(`/buckets/${publicId}`, {
    headers: ownerTokenHeader(ownerToken),
  })
}

/** Fetch a single captured request belonging to a bucket. */
export function getRequestDetail(
  publicId: string,
  requestId: number,
  ownerToken: string,
): Promise<BucketRequest> {
  return request<BucketRequest>(`/buckets/${publicId}/requests/${requestId}`, {
    headers: ownerTokenHeader(ownerToken),
  })
}

/**
 * WebSocket URL for a bucket's live request feed.
 *
 * The backend route is declared as `/ws/{bucket_id}` but broadcasts are keyed
 * on the bucket's public_id (see routes/catch_all.py), so this takes the UUID,
 * not the integer bucket_id.
 */
export function wsUrl(publicId: string): string {
  return `${BASE_URL.replace(/^http/, 'ws')}/ws/${publicId}`
}

/**
 * The URL inbound requests get sent to for a bucket -- i.e. the URL a user
 * copies out of the UI and points their webhook at.
 *
 * The trailing slash matters: the catch-all route is `/{public_id}/{path}`, so
 * a bare `/{public_id}` answers with a 307 redirect that some webhook providers
 * will not follow.
 */
export function captureUrl(publicId: string): string {
  return `${BASE_URL}/${publicId}/`
}
