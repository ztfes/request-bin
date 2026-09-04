import type { ConnectionStatus as ConnectionStatusValue } from '../lib/ws'
import { Bubble } from './Doodles'
import './ConnectionStatus.css'

const LABELS: Record<ConnectionStatusValue, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Disconnected',
  'not-found': 'Bin not found',
}

interface ConnectionStatusProps {
  status: ConnectionStatusValue
}

function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <span className={`connection-status connection-status-${status}`} role="status">
      <Bubble color="currentColor" size={16} strokeWidth={10} className="connection-status-dot" />
      {LABELS[status]}
    </span>
  )
}

export default ConnectionStatus
