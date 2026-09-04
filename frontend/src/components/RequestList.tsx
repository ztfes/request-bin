import type { BucketRequestMessage } from '../lib/ws'
import { formatReceivedAt } from '../lib/format'

interface RequestListProps {
  requests: BucketRequestMessage[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function RequestList({ requests, selectedId, onSelect }: RequestListProps) {
  return (
    <div className="paper paper--b lifted request-pane">
      <ul className="request-list">
        {requests.map((req) => (
          <li key={req.id}>
            <button
              type="button"
              className="request-card"
              aria-current={req.id === selectedId}
              onClick={() => onSelect(req.id)}
            >
              <span className={`method method-${req.method.toLowerCase()}`}>{req.method}</span>
              <span className="path" title={req.path}>
                {req.path}
              </span>
              <span className="received-at">{formatReceivedAt(req.received_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default RequestList
