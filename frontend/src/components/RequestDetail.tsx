import type { ReactNode } from 'react'
import type { BucketRequestMessage } from '../lib/ws'
import { formatReceivedAt } from '../lib/format'

interface RequestDetailProps {
  request: BucketRequestMessage | undefined
}

/**
 * Colourises a JSON body the way the design reference does. Returns null for
 * anything that isn't valid JSON — form-encoded, XML and plain-text bodies
 * fall back to rendering verbatim rather than being mangled by a tokeniser
 * that doesn't understand them.
 */
function highlightJson(raw: string): ReactNode[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const pretty = JSON.stringify(parsed, null, 2)
  const token =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g

  const out: ReactNode[] = []
  let last = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = token.exec(pretty)) !== null) {
    const [full, str, colon, num, literal] = match

    if (match.index > last) out.push(pretty.slice(last, match.index))

    if (str !== undefined) {
      // A string followed by a colon is an object key, not a value.
      out.push(
        <span key={key++} className={colon ? 'json-key' : 'json-string'}>
          {str}
        </span>,
      )
      if (colon) out.push(colon)
    } else if (num !== undefined) {
      out.push(
        <span key={key++} className="json-number">
          {num}
        </span>,
      )
    } else if (literal !== undefined) {
      out.push(
        <span key={key++} className="json-literal">
          {literal}
        </span>,
      )
    }

    last = match.index + full.length
  }

  if (last < pretty.length) out.push(pretty.slice(last))

  return out
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
  const highlighted = request.body ? highlightJson(request.body) : null

  return (
    <div className="request-detail">
      <header className="request-detail-header">
        <span className={`method method-${request.method.toLowerCase()}`}>{request.method}</span>
        <span className="path">{request.path}</span>
      </header>
      <p className="received-at muted">{formatReceivedAt(request.received_at)}</p>

      <h3>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M3 12h18M3 18h12" />
        </svg>
        Headers
      </h3>
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

      <h3>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        Body
      </h3>
      {request.body ? (
        <pre className="body">{highlighted ?? request.body}</pre>
      ) : (
        <p className="muted">No body captured.</p>
      )}
    </div>
  )
}

export default RequestDetail
