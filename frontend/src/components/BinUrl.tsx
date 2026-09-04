import { useState } from 'react'

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
    <div className="bin-url-card">
      <span className="bin-url-label">Your bucket URL</span>
      <div className="bin-url-row">
        <code className="bin-url">{url}</code>
        <button
          type="button"
          className="copy-button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy bucket URL'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {copied ? (
              <path d="M20 6 9 17l-5-5" />
            ) : (
              <>
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  )
}

export default BinUrl
