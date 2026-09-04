import { useEffect, useMemo, useRef, useState } from 'react'
import { BucketRequestSocket, type BucketRequestMessage, type ConnectionStatus } from '../lib/ws'

export interface UseBucketRequestFeedResult {
  requests: BucketRequestMessage[]
  status: ConnectionStatus
  // True once retention has deleted the whole bin. The socket is closed and
  // `requests` is empty; there is nothing left to reconnect to.
  expired: boolean
}

export interface UseBucketRequestFeedOptions {
  // Fires for each request received live over the socket (not for
  // `initialRequests` or replayed history on reconnect).
  onLiveRequest?: (message: BucketRequestMessage) => void
}

// Shared reference so omitting `initialRequests` doesn't hand back a fresh
// array (and therefore a new `requests` identity) on every render.
const EMPTY_REQUESTS: BucketRequestMessage[] = []
const EMPTY_REMOVED_IDS: ReadonlySet<number> = new Set()

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
  { onLiveRequest }: UseBucketRequestFeedOptions = {},
): UseBucketRequestFeedResult {
  const [trackedBucketId, setTrackedBucketId] = useState(bucketId)
  const [liveMessages, setLiveMessages] = useState<BucketRequestMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  // Ids retention has deleted. Tracked separately from `liveMessages`
  // because a deleted request usually lives in `initialRequests`, which
  // belongs to the caller and can't be edited from here.
  const [removedIds, setRemovedIds] = useState<ReadonlySet<number>>(EMPTY_REMOVED_IDS)
  const [expired, setExpired] = useState(false)

  // Ref so the effect below doesn't need to resubscribe when the caller
  // passes a new callback identity.
  const onLiveRequestRef = useRef(onLiveRequest)
  onLiveRequestRef.current = onLiveRequest

  // Reset feed state during render when bucketId changes, rather than in an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect
  if (bucketId !== trackedBucketId) {
    setTrackedBucketId(bucketId)
    setLiveMessages([])
    setStatus('connecting')
    setRemovedIds(EMPTY_REMOVED_IDS)
    setExpired(false)
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
        onLiveRequestRef.current?.(message)
      },
      onRequestsRemoved: (ids) => {
        const removed = new Set(ids)
        setLiveMessages((current) => current.filter((m) => !removed.has(m.id)))
        setRemovedIds((current) => new Set([...current, ...ids]))
      },
      onBinExpired: () => {
        setExpired(true)
        setLiveMessages([])
      },
    })

    socket.connect()

    return () => {
      socket.close()
    }
  }, [bucketId])

  const requests = useMemo(() => {
    if (expired) return EMPTY_REQUESTS
    const liveIds = new Set(liveMessages.map((message) => message.id))
    const merged =
      liveMessages.length === 0
        ? initialRequests
        : [...liveMessages, ...initialRequests.filter((request) => !liveIds.has(request.id))]
    // Applied to the merge, not just `liveMessages`: a trimmed request is
    // usually one the REST fetch supplied.
    if (removedIds.size === 0) return merged
    return merged.filter((request) => !removedIds.has(request.id))
  }, [expired, liveMessages, initialRequests, removedIds])

  return { requests, status: bucketId ? status : 'closed', expired }
}
