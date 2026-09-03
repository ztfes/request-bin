import { useState } from 'react'
import BinInspector from './components/BinInspector'
import { getStoredBin } from './lib/binStorage'
import './App.css'

interface BinRef {
  publicId: string
  ownerToken: string | null
}

const BIN_ROUTE = /^\/bins\/([^/]+)\/?$/

/**
 * Resolves which bin (if any) to show on load:
 * - a `/bins/:publicId` URL wins, paired with the owner token from
 *   localStorage when it matches that same bin
 * - otherwise falls back to the last bin created in this browser
 *   (written by the Create Bin UI, 260-14) and rewrites the URL to match
 */
function resolveBinRef(): BinRef | null {
  const match = BIN_ROUTE.exec(window.location.pathname)
  const stored = getStoredBin()

  if (match) {
    const publicId = decodeURIComponent(match[1])
    const ownerToken = stored?.publicId === publicId ? stored.ownerToken : null
    return { publicId, ownerToken }
  }

  if (stored) {
    window.history.replaceState(null, '', `/bins/${stored.publicId}`)
    return { publicId: stored.publicId, ownerToken: stored.ownerToken }
  }

  return null
}

function App() {
  const [binRef] = useState(resolveBinRef)

  if (!binRef) {
    return (
      <div className="bin-inspector">
        <main className="bin-inspector-body">
          <div className="empty-state">
            <h2>No bin found</h2>
            <p>Create a bin to start capturing requests.</p>
          </div>
        </main>
      </div>
    )
  }

  return <BinInspector publicId={binRef.publicId} ownerToken={binRef.ownerToken} />
}

export default App
