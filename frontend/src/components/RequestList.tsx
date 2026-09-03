import type { BucketRequestOut } from '../lib/api'
import { formatReceivedAt } from '../lib/format'

interface RequestListProps {
  requests: BucketRequestOut[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function RequestList({ requests, selectedId, onSelect }: RequestListProps) {
  return (
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
          </button>
        </li>
      ))}
    </ul>
  )
}

export default RequestList
