import { useEffect, useState } from 'react'
import { ApiError, binUrl, listBucketRequests, type BucketRequestOut } from '../lib/api'
import BinUrl from './BinUrl'
import RequestDetail from './RequestDetail'
import RequestList from './RequestList'

interface BinInspectorProps {
  publicId: string
  ownerToken: string | null
}

function Header({ url }: { url: string }) {
  return (
    <header className="bin-inspector-header">
      <h1>Bin Inspector</h1>
      <BinUrl url={url} />
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
  | { status: 'loaded'; requests: BucketRequestOut[] }

function BinInspectorContent({ publicId, ownerToken, url }: BinInspectorContentProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    listBucketRequests(publicId, ownerToken)
      .then((data) => {
        if (cancelled) return
        const sorted = [...data.requests].sort(
          (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
        )
        setState({ status: 'loaded', requests: sorted })
        setSelectedId((current) =>
          current !== null && sorted.some((r) => r.id === current) ? current : (sorted[0]?.id ?? null),
        )
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

  function retry() {
    setState({ status: 'loading' })
    setAttempt((a) => a + 1)
  }

  return (
    <div className="bin-inspector">
      <Header url={url} />

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

        {state.status === 'loaded' && state.requests.length === 0 && (
          <div className="empty-state">
            <h2>No requests yet</h2>
            <p>Send a request to the URL above and it will show up here.</p>
          </div>
        )}

        {state.status === 'loaded' && state.requests.length > 0 && (
          <div className="panes">
            <RequestList
              requests={state.requests}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <RequestDetail request={state.requests.find((r) => r.id === selectedId)} />
          </div>
        )}
      </main>
    </div>
  )
}

export default BinInspector
