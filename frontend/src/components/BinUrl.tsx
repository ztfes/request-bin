import { useState } from 'react'
import { CheckDoodle, CopyDoodle } from './Doodles'

interface BinUrlProps {
  url: string
}

function BinUrl({ url }: BinUrlProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard access denied or unavailable; nothing to fall back to
    }
  }

  return (
    <div className="bin-url-row">
      <code className="bin-url">{url}</code>
      <button type="button" className="ink-button ink-button--sunny copy-button" onClick={handleCopy}>
        {copied ? <CheckDoodle size={17} /> : <CopyDoodle size={17} />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

export default BinUrl
