import './BrandMark.css'

function BrandMark() {
  return (
    <div className="brand-mark">
      <img src="/bucket.png" alt="" className="brand-mark-icon" aria-hidden="true" />
      <span className="brand-mark-title">
        Chumm
        <br />
        Bucket
      </span>
      <span className="brand-mark-divider" aria-hidden="true" />
      <span className="brand-mark-subtitle">
        Request
        <br />
        Inspector
      </span>
    </div>
  )
}

export default BrandMark
