import type { BucketRequestMessage } from '../lib/ws'
import { formatReceivedAt } from '../lib/format'

interface RequestDetailProps {
  request: BucketRequestMessage | undefined
}

function RequestDetail({ request }: RequestDetailProps) {
  if (!request) {
    return (
      <div className="request-detail">
        <p className="muted">Select a request to see its details.</p>
      </div>
    )
  }

  const headerEntries = Object.entries(request.headers ?? {})

  return (
    <div className="request-detail">
      <header className="request-detail-header">
        <span className={`method method-${request.method.toLowerCase()}`}>{request.method}</span>
        <span className="path">{request.path}</span>
      </header>
      <p className="received-at">{formatReceivedAt(request.received_at)}</p>

      <h3>Headers</h3>
      {headerEntries.length === 0 ? (
        <p className="muted">No headers captured.</p>
      ) : (
        <table className="headers-table">
          <tbody>
            {headerEntries.map(([key, value]) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Body</h3>
      {request.body ? (
        <pre className="body">{request.body}</pre>
      ) : (
        <p className="muted">No body captured.</p>
      )}
    </div>
  )
}

export default RequestDetail
