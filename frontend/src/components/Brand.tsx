interface BrandProps {
  /** Renders the wordmark as an <h1>. Set false where the page already has one. */
  heading?: boolean
}

function Brand({ heading = true }: BrandProps) {
  const Name = heading ? 'h1' : 'p'

  return (
    <div className="brand">
      <Name className="brand-name">Chum Bucket</Name>
      <p className="brand-tagline">Request Catcher</p>
    </div>
  )
}

export default Brand
