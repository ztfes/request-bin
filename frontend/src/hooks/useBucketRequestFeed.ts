import { useEffect, useMemo, useState } from 'react'
import { BucketRequestSocket, type BucketRequestMessage, type ConnectionStatus } from '../lib/ws'

export interface UseBucketRequestFeedResult {
  requests: BucketRequestMessage[]
  status: ConnectionStatus
}

// Shared reference so omitting `initialRequests` doesn't hand back a fresh
// array (and therefore a new `requests` identity) on every render.
const EMPTY_REQUESTS: BucketRequestMessage[] = []

/**
 * Opens a live websocket feed for `bucketId` and merges incoming requests
 * (newest first) on top of `initialRequests` (e.g. from the REST list
 * fetch in 260-15), deduping by request id.
 *
 * `initialRequests` is re-merged on every render (not just when the socket
 * (re)connects), so it's safe to pass `[]` while a REST fetch for the
 * bucket's history is still in flight and the real array once it resolves.
 * Pass a stable reference (e.g. state, not an inline literal) if you need
 * `requests`'s identity to stay stable across unrelated re-renders too.
 *
 * Reconnects with backoff on drop and closes cleanly on unmount or when
 * `bucketId` changes. Pass `null` to stay disconnected (e.g. no bin
 * selected yet).
 */
export function useBucketRequestFeed(
  bucketId: string | null,
  initialRequests: BucketRequestMessage[] = EMPTY_REQUESTS,
): UseBucketRequestFeedResult {
  const [trackedBucketId, setTrackedBucketId] = useState(bucketId)
  const [liveMessages, setLiveMessages] = useState<BucketRequestMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  // Reset feed state during render when bucketId changes, rather than in an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect
  if (bucketId !== trackedBucketId) {
    setTrackedBucketId(bucketId)
    setLiveMessages([])
    setStatus('connecting')
  }

  useEffect(() => {
    if (!bucketId) return

    // Dedupes messages received *this connection* in O(1); duplicates
    // against initialRequests are handled separately in the merge below.
    const seenLiveIds = new Set<number>()

    const socket = new BucketRequestSocket(bucketId, {
      onStatusChange: setStatus,
      onMessage: (message) => {
        if (seenLiveIds.has(message.id)) return
        seenLiveIds.add(message.id)
        setLiveMessages((current) => [message, ...current])
      },
    })

    socket.connect()

    return () => {
      socket.close()
    }
  }, [bucketId])

  const requests = useMemo(() => {
    if (liveMessages.length === 0) return initialRequests
    const liveIds = new Set(liveMessages.map((message) => message.id))
    return [...liveMessages, ...initialRequests.filter((request) => !liveIds.has(request.id))]
  }, [liveMessages, initialRequests])

  return { requests, status: bucketId ? status : 'closed' }
}
