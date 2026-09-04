import type { BucketRequestMessage } from '../lib/ws'
import { formatReceivedAt } from '../lib/format'
import { Bubble, WavyRule } from './Doodles'

interface RequestDetailProps {
  request: BucketRequestMessage | undefined
}

function RequestDetail({ request }: RequestDetailProps) {
  if (!request) {
    return (
      <div className="paper lifted request-detail request-detail-empty">
        <Bubble color="violet" size={34} />
        <p className="muted">Select a request to see its details.</p>
      </div>
    )
  }

  const headerEntries = Object.entries(request.headers ?? {})

  return (
    <div className="paper lifted request-detail">
      {/* The inner element scrolls so the panel's drawn double edge stays put. */}
      <div className="request-detail-scroll">
        <header className="request-detail-header">
          <span className={`method method-${request.method.toLowerCase()}`}>{request.method}</span>
          <span className="path">{request.path}</span>
        </header>
        <p className="received-at">{formatReceivedAt(request.received_at)}</p>

        <h3>Headers</h3>
        <WavyRule className="detail-rule" color="var(--indigo)" />
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
        <WavyRule className="detail-rule" color="var(--lime)" />
        {request.body ? (
          <pre className="body">{request.body}</pre>
        ) : (
          <p className="muted">No body captured.</p>
        )}
      </div>
    </div>
  )
}

export default RequestDetail
