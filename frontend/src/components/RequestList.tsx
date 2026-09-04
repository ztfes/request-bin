import type { BucketRequestMessage } from '../lib/ws'
import { formatReceivedAt } from '../lib/format'

interface RequestListProps {
  requests: BucketRequestMessage[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function RequestList({ requests, selectedId, onSelect }: RequestListProps) {
  return (
    <section className="request-list-panel">
      <header className="panel-header">
        <svg
          className="panel-header-icon"
          width="26"
          height="16"
          viewBox="0 0 26 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M1 4c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0 4 2.5 6 0" />
          <path d="M1 12c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0 4 2.5 6 0" />
        </svg>
        <h2>Caught Requests</h2>
      </header>

      <ul className="request-list">
        {requests.map((req) => (
          <li key={req.id}>
            <button
              type="button"
              className="request-list-item"
              aria-current={req.id === selectedId}
              onClick={() => onSelect(req.id)}
            >
              <span className={`method method-${req.method.toLowerCase()}`}>{req.method}</span>
              <span className="path" title={req.path}>
                {req.path}
              </span>
              <span className="received-at">{formatReceivedAt(req.received_at)}</span>
              <svg
                className="chevron"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RequestList
