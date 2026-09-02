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

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface BucketSocketHandlers {
  onMessage: (message: BucketRequestMessage) => void
  onStatusChange: (status: ConnectionStatus) => void
}

const DEFAULT_API_URL = 'http://localhost:8000'
const MIN_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

function resolveWsUrl(bucketId: string): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_API_URL
  const wsUrl = apiUrl.replace(/^http/, 'ws')
  return `${wsUrl}/ws/${encodeURIComponent(bucketId)}`
}

function isBucketRequestMessage(value: unknown): value is BucketRequestMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'number' &&
    typeof (value as { method?: unknown }).method === 'string' &&
    typeof (value as { path?: unknown }).path === 'string'
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

    const socket = new WebSocket(resolveWsUrl(this.bucketId))
    this.socket = socket

    socket.onopen = () => {
      this.reconnectAttempt = 0
      this.handlers.onStatusChange('open')
    }

    socket.onmessage = (event) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(event.data as string)
      } catch {
        return
      }
      if (isBucketRequestMessage(parsed)) {
        this.handlers.onMessage(parsed)
      }
    }

    socket.onclose = () => {
      this.socket = null
      if (this.closedByCaller) return
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
