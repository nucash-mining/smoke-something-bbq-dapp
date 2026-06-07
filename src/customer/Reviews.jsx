import { useState } from 'react'
import StarRating from '../components/StarRating.jsx'
import { addReview } from '../lib/db.js'
import { useSession } from '../context/SessionContext.jsx'

// Expanded reviews panel for one menu item. `reviews` is passed in (already
// loaded by Menu); onAdded refreshes the parent so the summary updates.
export default function Reviews({ itemId, reviews, onAdded, onNeedAuth }) {
  const { session } = useSession()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setErr(null)
    if (!session) { onNeedAuth && onNeedAuth(); return }
    if (!rating) { setErr('Pick a star rating.'); return }
    try {
      setBusy(true)
      await addReview({ menuItemId: itemId, session, rating, comment })
      setRating(0); setComment('')
      onAdded && onAdded()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <div className="reviews">
      <form className="review-form" onSubmit={submit}>
        <div className="rf-stars">
          <span className="m-sub">Your rating:</span>
          <StarRating value={rating} onChange={setRating} size={22} />
        </div>
        <textarea
          className="field"
          rows={2}
          placeholder="Add a comment (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="btn secondary" disabled={busy}>
          {busy ? 'Posting…' : session ? 'Post review' : 'Sign in to review'}
        </button>
        {err ? <div className="status err">{err}</div> : null}
      </form>

      <div className="review-list">
        {reviews.length === 0 ? (
          <p className="m-sub">No reviews yet — be the first!</p>
        ) : reviews.map((r) => (
          <div className="review" key={r.id}>
            <div className="rv-head">
              <StarRating value={r.rating} size={14} />
              <span className="rv-author">{r.author_name || 'Anonymous'}</span>
            </div>
            {r.comment ? <div className="rv-comment">{r.comment}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
