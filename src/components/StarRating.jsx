import { useState } from 'react'

// Display stars (read-only) or let the user pick a rating (interactive).
// value: number 0-5. onChange present => interactive.
export default function StarRating({ value = 0, onChange, size = 18, count }) {
  const [hover, setHover] = useState(0)
  const interactive = typeof onChange === 'function'
  const shown = hover || value

  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(shown)
        return interactive ? (
          <button
            key={n}
            type="button"
            className="star-btn"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{ color: filled ? '#ffb02e' : 'var(--line)' }}
          >★</button>
        ) : (
          <span key={n} style={{ color: filled ? '#ffb02e' : 'var(--line)' }}>★</span>
        )
      })}
      {count != null ? (
        <span className="star-count">
          {value ? value.toFixed(1) : '—'} {count ? `(${count})` : '(no reviews)'}
        </span>
      ) : null}
    </span>
  )
}
