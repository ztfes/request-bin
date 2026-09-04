import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import { ApiError, bucketUrl, listBucketRequests } from '../lib/api'
import { useBucketRequestFeed } from '../hooks/useBucketRequestFeed'
import { useTheme } from '../theme/ThemeContext'
import type { BucketRequestMessage, ConnectionStatus as ConnectionStatusValue } from '../lib/ws'
import BucketUrl from './BucketUrl'
import BrandMark from './BrandMark'
import ConnectionStatus from './ConnectionStatus'
import RequestDetail from './RequestDetail'
import RequestList from './RequestList'

interface BucketInspectorProps {
  publicId: string
  ownerToken: string | null
}

function Header({ url, status }: { url: string; status?: ConnectionStatusValue }) {
  const { theme } = useTheme()
  const isChumBucket = theme === 'chum-bucket'

  return (
    <header className="bucket-inspector-header">
      <Link to="/" className="bucket-inspector-home-link">
        {isChumBucket ? <BrandMark /> : <h1>Bucket Inspector</h1>}
      </Link>

      <div className="bucket-url-card">
        <span className="bucket-url-card-label">Your bucket URL</span>
        <BucketUrl url={url} />
      </div>

      {status && <ConnectionStatus status={status} />}
    </header>
  )
}

function BucketInspector({ publicId, ownerToken }: BucketInspectorProps) {
  const url = bucketUrl(publicId)

  if (!ownerToken) {
    return (
      <div className="bucket-inspector">
        <Header url={url} />
        <main className="bucket-inspector-body">
          <div className="status error">
            <p>No access token found for this bucket in this browser.</p>
          </div>
        </main>
      </div>
    )
  }

  return <BucketInspectorContent publicId={publicId} ownerToken={ownerToken} url={url} />
}

interface BucketInspectorContentProps {
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

function BucketInspectorContent({ publicId, ownerToken, url }: BucketInspectorContentProps) {
  const { theme } = useTheme()
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
  const {
    requests: liveRequests,
    status: wsStatus,
    expired,
  } = useBucketRequestFeed(publicId, initialRequests, {
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
    <div className="bucket-inspector">
      <Header url={url} status={expired ? undefined : wsStatus} />

      <main className="bucket-inspector-body">
        {/* Checked before the load states: once the bin is gone the REST
            data behind them describes something that no longer exists. */}
        {expired && (
          <div className="empty-state">
            <h2>
              {theme === 'chum-bucket'
                ? 'This bucket has been hosed out'
                : 'This bin has expired'}
            </h2>
            <p>
              {theme === 'chum-bucket'
                ? 'It sat empty too long, so the chumm went overboard. Make a new one to keep fishing.'
                : 'It went too long without a request, so it and its history were deleted. Create a new bin to keep going.'}
            </p>
            <Link to="/" className="empty-state-link">
              {theme === 'chum-bucket' ? 'Grab a fresh bucket' : 'Create a new bin'}
            </Link>
          </div>
        )}

        {!expired && state.status === 'loading' && <p className="status">Loading requests…</p>}

        {!expired && state.status === 'error' && (
          <div className="status error">
            <p>{state.message}</p>
            <button type="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {!expired && state.status === 'loaded' && requests.length === 0 && (
          <div className="empty-state">
            <h2>{theme === 'chum-bucket' ? 'No chumm in the bucket yet' : 'No requests yet'}</h2>
            <p>
              {theme === 'chum-bucket'
                ? 'Send a request to the URL above and watch the chumm roll in.'
                : 'Send a request to the URL above and it will show up here.'}
            </p>
          </div>
        )}

        {!expired && state.status === 'loaded' && requests.length > 0 && (
          <div className="panes">
            <div className="request-list-pane">
              {theme === 'chum-bucket' && (
                <div className="request-list-pane-header">
                  <span aria-hidden="true">〰</span>
                  Caught requests
                </div>
              )}
              <RequestList
                requests={requests}
                selectedId={selectedId}
                onSelect={setPinnedId}
              />
            </div>
            <RequestDetail request={selected} />
          </div>
        )}
      </main>
    </div>
  )
}

export default BucketInspector
