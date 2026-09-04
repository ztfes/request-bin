import { useState } from 'react'

interface BucketUrlProps {
  url: string
}

function BucketUrl({ url }: BucketUrlProps) {
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
    <div className="bucket-url-row">
      <code className="bucket-url">{url}</code>
      <button type="button" className="copy-button" onClick={handleCopy}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

export default BucketUrl
