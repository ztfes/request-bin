/**
 * Shared masthead: the wordmark and whatever the current route wants to park on
 * the right (the bin URL and its live status, on the request view).
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './SiteHeader.css'

interface SiteHeaderProps {
  children?: ReactNode
}

function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="wordmark" to="/">
          <span className="wordmark-text">CHUM Bucket</span>
          <span className="wordmark-tagline">Catch. Inspect. Debug.</span>
        </Link>

        {children && <div className="site-header-side">{children}</div>}
      </div>
    </header>
  )
}

export default SiteHeader
