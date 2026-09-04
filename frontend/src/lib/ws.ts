/**
 * Standalone websocket client for a bucket's live request feed.
 *
 * Not wired into any view yet — 260-15 (Bin Inspector UI) and 260-19
 * (shared API/WS client config) haven't landed. `resolveWsUrl` reads
 * `VITE_API_URL` so it stays compatible with whatever base-URL config
 * 260-19 introduces.
 */

export interface BucketRequestMessage {
  id: number
  method: string
  path: string
  headers: Record<string, string> | null
  body: string | null
  received_at: string
  mongo_id: string
}

/**
 * Control messages the backend sends when retention deletes something --
 * the cap trimming a bin's oldest requests, or a TTL sweep expiring
 * requests or a whole bin.
 *
 * They're discriminated by `type`, which capture messages don't carry, so
 * a client running older code drops them in `isBucketRequestMessage`
 * instead of mistaking one for a request.
 */
export interface RequestsRemovedMessage {
  type: 'requests_removed'
  ids: number[]
}

export interface BinExpiredMessage {
  type: 'bin_expired'
}

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'not-found'

/**
 * WebSocket close codes 4000-4999 are reserved for private/application use
 * per RFC 6455 §7.4.2 — browsers, proxies, and the platform itself never
 * assign one for a normal or dropped connection, only our own backend does.
 * Treating the whole range as terminal (not worth retrying) means we don't
 * have to match the exact code the backend happens to send.
 *
 * Today that's 260-22 closing with `code=4404` when `bucket_id` doesn't
 * resolve to a real bucket — verified against its actual implementation
 * (branch `test/260-22-validatebucketonWSconnect`, PR #5) at the time this
 * was written. Retrying against a 4404 would just loop forever, so it's
 * treated as terminal rather than a transient drop.
 *
 * NOT YET LIVE on `main` as of 260-16: `backend/routes/websocket.py` there
 * still accepts any bucket_id unconditionally, so this branch is
 * unreachable/untested until 260-22 merges.
 */
const APPLICATION_CLOSE_CODE_MIN = 4000
const APPLICATION_CLOSE_CODE_MAX = 4999

function isApplicationCloseCode(code: number): boolean {
  return code >= APPLICATION_CLOSE_CODE_MIN && code <= APPLICATION_CLOSE_CODE_MAX
}

export interface BucketSocketHandlers {
  onMessage: (message: BucketRequestMessage) => void
  onStatusChange: (status: ConnectionStatus) => void
  // Retention deleted these requests; drop them from the view.
  onRequestsRemoved?: (ids: number[]) => void
  // The whole bin aged out. Nothing is left to reconnect to.
  onBinExpired?: () => void
}

const DEFAULT_API_URL = 'http://localhost:8000'
const MIN_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

function resolveWsUrl(bucketId: string): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  // Falls back to DEFAULT_API_URL for unset/blank *and* schemeless values
  // (e.g. a `VITE_API_URL=localhost:8000` typo missing `http://`) so we
  // never hand `new WebSocket()` a URL with no ws/wss scheme.
  const apiUrl = configured && /^https?:\/\//.test(configured) ? configured : DEFAULT_API_URL
  const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/+$/, '')
  return `${wsUrl}/ws/${encodeURIComponent(bucketId)}`
}

function isRequestsRemovedMessage(value: unknown): value is RequestsRemovedMessage {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.type === 'requests_removed' &&
    Array.isArray(v.ids) &&
    v.ids.every((id) => typeof id === 'number')
  )
}

function isBinExpiredMessage(value: unknown): value is BinExpiredMessage {
  return typeof value === 'object' && value !== null &&
    (value as Record<string, unknown>).type === 'bin_expired'
}

function isBucketRequestMessage(value: unknown): value is BucketRequestMessage {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'number' &&
    typeof v.method === 'string' &&
    typeof v.path === 'string' &&
    (v.headers === null || typeof v.headers === 'object') &&
    (v.body === null || typeof v.body === 'string') &&
    typeof v.received_at === 'string' &&
    typeof v.mongo_id === 'string'
  )
}

/**
 * Manages a single reconnecting websocket for one bucket's live feed.
 * Reconnects with exponential backoff (1s -> 30s cap) whenever the
 * connection drops, unless `close()` was called explicitly.
 */
export class BucketRequestSocket {
  private readonly bucketId: string
  private readonly handlers: BucketSocketHandlers
  private socket: WebSocket | null = null
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closedByCaller = false

  constructor(bucketId: string, handlers: BucketSocketHandlers) {
    this.bucketId = bucketId
    this.handlers = handlers
  }

  connect(): void {
    this.closedByCaller = false
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
    this.open()
  }

  close(): void {
    this.closedByCaller = true
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
  }

  private open(): void {
    this.handlers.onStatusChange(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(resolveWsUrl(this.bucketId))
    } catch (error) {
      // Defense-in-depth: resolveWsUrl already guards against a
      // schemeless/blank VITE_API_URL, but this keeps a truly malformed
      // URL from throwing synchronously out of connect()/scheduleReconnect
      // and killing the reconnect loop instead of just retrying it.
      console.error('Failed to open bucket request socket', error)
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      if (this.socket !== socket) return
      this.reconnectAttempt = 0
      this.handlers.onStatusChange('open')
    }

    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      let parsed: unknown
      try {
        parsed = JSON.parse(event.data as string)
      } catch {
        return
      }
      if (isRequestsRemovedMessage(parsed)) {
        this.handlers.onRequestsRemoved?.(parsed.ids)
        return
      }
      if (isBinExpiredMessage(parsed)) {
        this.handlers.onBinExpired?.()
        // The bucket row is gone, so reconnecting would only earn a 4404.
        // close() sets closedByCaller, which stops the backoff loop.
        this.close()
        return
      }
      if (isBucketRequestMessage(parsed)) {
        this.handlers.onMessage(parsed)
      }
    }

    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      if (this.closedByCaller) return
      if (isApplicationCloseCode(event.code)) {
        this.handlers.onStatusChange('not-found')
        return
      }
      this.scheduleReconnect()
    }

    socket.onerror = () => {
      socket.close()
    }
  }

  private scheduleReconnect(): void {
    this.handlers.onStatusChange('reconnecting')
    const delay = Math.min(
      MIN_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    )
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }
}
