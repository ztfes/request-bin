import { useEffect, useRef } from 'react'
import type { StoredBucket } from '../lib/binStorage'
import { BucketRequestSocket } from '../lib/ws'

export interface BinListWatchHandlers {
  // The bin no longer exists server-side: retention expired it, or it was
  // already gone when we connected.
  onExpired: (bucket: StoredBucket) => void
  // This bin's contents changed. The caller should re-read its stats rather
  // than adjusting a counter: `requests_removed` carries request ids, not
  // paths, so the endpoint count can't be derived from the message and would
  // drift out of sync with the request count.
  onChanged: (bucket: StoredBucket) => void
}

/**
 * Keeps one live socket per bin in the landing page's list, so a bin that
 * expires (or fills past its cap) updates without a reload.
 *
 * The bin inspector uses `useBucketRequestFeed` for a single bin's full
 * request feed; this watches many bins for lifecycle changes only, and
 * deliberately keeps none of the messages.
 */
export function useBinListWatch(buckets: StoredBucket[], handlers: BinListWatchHandlers): void {
  const handlersRef = useRef(handlers)
  const bucketsRef = useRef(buckets)

  // Written in effects, not during render: a ref assignment in the render
  // body is what `react-hooks/refs` flags. Declared before the socket effect
  // below so they're already current when it runs.
  useEffect(() => {
    handlersRef.current = handlers
  })
  useEffect(() => {
    bucketsRef.current = buckets
  })

  // Keyed on the ids rather than the array so an unrelated re-render (or a
  // fresh array holding the same bins) doesn't tear down every socket.
  const key = buckets.map((bucket) => bucket.public_id).join(',')

  useEffect(() => {
    const sockets = bucketsRef.current.map((bucket) => {
      const socket = new BucketRequestSocket(bucket.public_id, {
        onMessage: () => handlersRef.current.onChanged(bucket),
        onRequestsRemoved: () => handlersRef.current.onChanged(bucket),
        onBinExpired: () => handlersRef.current.onExpired(bucket),
        onStatusChange: (status) => {
          // 'not-found' is the 4404 close for a bin that's already gone --
          // the socket equivalent of the REST 404. Every other status
          // (reconnecting, closed) may just be the backend restarting, and
          // must not drop the bin's owner token.
          if (status === 'not-found') handlersRef.current.onExpired(bucket)
        },
      })
      socket.connect()
      return socket
    })

    return () => {
      sockets.forEach((socket) => socket.close())
    }
  }, [key])
}
