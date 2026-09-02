import type { ConnectionStatus as ConnectionStatusValue } from '../lib/ws'
import './ConnectionStatus.css'

const LABELS: Record<ConnectionStatusValue, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Disconnected',
}

interface ConnectionStatusProps {
  status: ConnectionStatusValue
}

function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <span className={`connection-status connection-status-${status}`} role="status">
      <span className="connection-status-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  )
}

export default ConnectionStatus
