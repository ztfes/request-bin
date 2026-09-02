import { useEffect, useState } from 'react'
import { BucketRequestSocket, type BucketRequestMessage, type ConnectionStatus } from '../lib/ws'

export interface UseBucketRequestFeedResult {
  requests: BucketRequestMessage[]
  status: ConnectionStatus
}

/**
 * Opens a live websocket feed for `bucketId` and merges incoming requests
 * (newest first) on top of `initialRequests` (e.g. from the REST list
 * fetch in 260-15), deduping by request id.
 *
 * Reconnects with backoff on drop and closes cleanly on unmount or when
 * `bucketId` changes. Pass `null` to stay disconnected (e.g. no bin
 * selected yet).
 */
export function useBucketRequestFeed(
  bucketId: string | null,
  initialRequests: BucketRequestMessage[] = [],
): UseBucketRequestFeedResult {
  const [trackedBucketId, setTrackedBucketId] = useState(bucketId)
  const [requests, setRequests] = useState<BucketRequestMessage[]>(initialRequests)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  // Reset feed state during render when bucketId changes, rather than in an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect
  if (bucketId !== trackedBucketId) {
    setTrackedBucketId(bucketId)
    setRequests(initialRequests)
    setStatus('connecting')
  }

  useEffect(() => {
    if (!bucketId) return

    const socket = new BucketRequestSocket(bucketId, {
      onStatusChange: setStatus,
      onMessage: (message) => {
        setRequests((current) =>
          current.some((request) => request.id === message.id) ? current : [message, ...current],
        )
      },
    })

    socket.connect()

    return () => {
      socket.close()
    }
  }, [bucketId])

  return { requests, status: bucketId ? status : 'closed' }
}
