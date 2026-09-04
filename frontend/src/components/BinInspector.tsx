import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import { ApiError, binUrl, listBucketRequests } from '../lib/api'
import { useBucketRequestFeed } from '../hooks/useBucketRequestFeed'
import type { BucketRequestMessage, ConnectionStatus as ConnectionStatusValue } from '../lib/ws'
import BinUrl from './BinUrl'
import ConnectionStatus from './ConnectionStatus'
import { Bubble, Bucket as PailArt, Flower, RefreshDoodle } from './Doodles'
import RequestDetail from './RequestDetail'
import RequestList from './RequestList'
import SiteHeader from './SiteHeader'

interface BinInspectorProps {
  publicId: string
  ownerToken: string | null
}

function Header({ url, status }: { url: string; status?: ConnectionStatusValue }) {
  return (
    <div className="bin-bar">
      <h1 className="bin-title">Bin Inspector</h1>
      <div className="bin-bar-row">
        <BinUrl url={url} />
        {status && <ConnectionStatus status={status} />}
      </div>
    </div>
  )
}

function BinInspector({ publicId, ownerToken }: BinInspectorProps) {
  const url = binUrl(publicId)

  if (!ownerToken) {
    return (
      <div className="page bin-inspector">
        <SiteHeader />
        <Header url={url} />
        <main className="bin-inspector-body">
          <div className="paper lifted state-card state-card-error">
            <PailArt size={72} className="state-pail state-pail-tipped" />
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
  // `null` means "follow the newest request". Only an explicit click pins one,
  // so live arrivals render immediately until the user picks a request.
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
  const { requests: liveRequests, status: wsStatus } = useBucketRequestFeed(publicId, initialRequests)
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
    <div className="page bin-inspector">
      <SiteHeader />
      <Header url={url} status={wsStatus} />

      <main className="bin-inspector-body">
        {state.status === 'loading' && (
          <div className="paper lifted state-card">
            <div className="loading-bubbles" aria-hidden="true">
              <Bubble color="foam" size={26} />
              <Bubble color="sunny" size={20} />
              <Bubble color="lime" size={15} />
            </div>
            <p>Filling the bucket…</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="paper lifted state-card state-card-error">
            <PailArt size={72} className="state-pail state-pail-tipped" />
            <p>{state.message}</p>
            <button type="button" className="ink-button ink-button--sunny" onClick={retry}>
              <RefreshDoodle size={18} />
              Retry
            </button>
          </div>
        )}

        {state.status === 'loaded' && requests.length === 0 && (
          <div className="paper lifted state-card">
            <div className="empty-art" aria-hidden="true">
              <PailArt size={96} className="state-pail" />
              <Flower color="lime" size={44} seed={1.2} strokeWidth={9} className="empty-bloom" />
            </div>
            <h2>No requests yet</h2>
            <p className="muted">Send a request to the URL above and it will show up here.</p>
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
