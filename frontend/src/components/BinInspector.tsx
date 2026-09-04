import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import { ApiError, binUrl, listBucketRequests } from '../lib/api'
import { useBucketRequestFeed } from '../hooks/useBucketRequestFeed'
import type { BucketRequestMessage, ConnectionStatus as ConnectionStatusValue } from '../lib/ws'
import BinUrl from './BinUrl'
import ConnectionStatus from './ConnectionStatus'
import RequestDetail from './RequestDetail'
import RequestList from './RequestList'

interface BinInspectorProps {
  publicId: string
  ownerToken: string | null
}

function Header({ url, status }: { url: string; status?: ConnectionStatusValue }) {
  return (
    <header className="bin-inspector-header">
      <h1>Bin Inspector</h1>
      <BinUrl url={url} />
      {status && <ConnectionStatus status={status} />}
    </header>
  )
}

function BinInspector({ publicId, ownerToken }: BinInspectorProps) {
  const url = binUrl(publicId)

  if (!ownerToken) {
    return (
      <div className="bin-inspector">
        <Header url={url} />
        <main className="bin-inspector-body">
          <div className="status error">
            <p>No access token found for this bin in this browser.</p>
          </div>
        </main>
      </div>
    )
  }

  return <BinInspectorContent publicId={publicId} ownerToken={ownerToken} url={url} />
}

interface BinInspectorContentProps {
  publicId: string
  ownerToken: string
  url: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; requests: BucketRequestMessage[] }

const EMPTY_REQUESTS: BucketRequestMessage[] = []

function sortByReceivedAtDesc(requests: BucketRequestMessage[]): BucketRequestMessage[] {
  return [...requests].sort(
    (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
  )
}

function BinInspectorContent({ publicId, ownerToken, url }: BinInspectorContentProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  // `null` means "follow the newest request". An explicit click pins one,
  // but a new request arriving live clears the pin so watchers always land
  // on the latest activity.
  const [pinnedId, setPinnedId] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    listBucketRequests(publicId, ownerToken)
      .then((data) => {
        if (cancelled) return
        setState({ status: 'loaded', requests: sortByReceivedAtDesc(data.requests) })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Failed to load requests.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [publicId, ownerToken, attempt])

  const initialRequests = state.status === 'loaded' ? state.requests : EMPTY_REQUESTS
  const { requests: liveRequests, status: wsStatus } = useBucketRequestFeed(publicId, initialRequests, {
    onLiveRequest: () => setPinnedId(null),
  })
  const requests = useMemo(() => sortByReceivedAtDesc(liveRequests), [liveRequests])

  // Derived, not state: falls back to the newest request whenever nothing is
  // pinned or the pinned request is no longer in the list.
  const selected = requests.find((r) => r.id === pinnedId) ?? requests[0]
  const selectedId = selected?.id ?? null

  function retry() {
    setState({ status: 'loading' })
    setAttempt((a) => a + 1)
  }

  return (
    <div className="bin-inspector">
      <Header url={url} status={wsStatus} />

      <main className="bin-inspector-body">
        {state.status === 'loading' && <p className="status">Loading requests…</p>}

        {state.status === 'error' && (
          <div className="status error">
            <p>{state.message}</p>
            <button type="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {state.status === 'loaded' && requests.length === 0 && (
          <div className="empty-state">
            <h2>No requests yet</h2>
            <p>Send a request to the URL above and it will show up here.</p>
          </div>
        )}

        {state.status === 'loaded' && requests.length > 0 && (
          <div className="panes">
            <RequestList
              requests={requests}
              selectedId={selectedId}
              onSelect={setPinnedId}
            />
            <RequestDetail request={selected} />
          </div>
        )}
      </main>
    </div>
  )
}

export default BinInspector
