import { useCallback, useEffect, useState } from 'react'
import { getMenu, getReviews, summarizeReviews } from '../lib/db.js'
import { fmtPrice, categoryOrder } from '../config.js'
import { useSession } from '../context/SessionContext.jsx'
import StarRating from '../components/StarRating.jsx'
import Reviews from './Reviews.jsx'

export default function Menu({ onNeedAuth }) {
  const { addToCart } = useSession()
  const [menu, setMenu] = useState([])
  const [reviewsMap, setReviewsMap] = useState({}) // itemId -> [reviews]
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const loadReviews = useCallback(async (items) => {
    const entries = await Promise.all(
      items.map(async (m) => [m.id, await getReviews(m.id).catch(() => [])])
    )
    setReviewsMap(Object.fromEntries(entries))
  }, [])

  useEffect(() => {
    let active = true
    getMenu()
      .then(async (m) => {
        if (!active) return
        setMenu(m)
        await loadReviews(m)
      })
      .catch((e) => active && setErr(e.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [loadReviews])

  const refreshItemReviews = useCallback(async (itemId) => {
    const rv = await getReviews(itemId).catch(() => [])
    setReviewsMap((m) => ({ ...m, [itemId]: rv }))
  }, [])

  if (loading) return <section className="section"><h2>Menu</h2><div className="card"><p className="m-sub">Loading menu…</p></div></section>
  if (err) return <section className="section"><h2>Menu</h2><div className="card"><div className="status err">{err}</div></div></section>

  const available = menu.filter((m) => m.available !== false)
  const cats = [...new Set(available.map((m) => m.category))].sort(
    (a, b) => (categoryOrder.indexOf(a) + 1 || 99) - (categoryOrder.indexOf(b) + 1 || 99)
  )

  return (
    <section className="section">
      <h2>Menu</h2>
      {cats.map((cat) => (
        <div className="card menu-cat" key={cat}>
          <h3 className="cat-title">{cat}</h3>
          {available.filter((m) => m.category === cat).map((item) => {
            const rv = reviewsMap[item.id] || []
            const { avg, count } = summarizeReviews(rv)
            const open = expanded === item.id
            return (
              <div className="menu-item-wrap" key={item.id}>
                <div className="menu-item">
                  {item.image_url ? (
                    <img className="mi-thumb" src={item.image_url} alt={item.name} loading="lazy" />
                  ) : null}
                  <div className="mi-info">
                    <div className="mi-name">{item.name}</div>
                    {item.description ? <div className="mi-desc">{item.description}</div> : null}
                    <button className="rv-toggle" onClick={() => setExpanded(open ? null : item.id)}>
                      <StarRating value={avg} size={14} count={count} />
                      <span className="chevron">{open ? '▲' : '▼'}</span>
                    </button>
                  </div>
                  <div className="mi-right">
                    <span className="mi-price">{fmtPrice(item.price)}</span>
                    <button className="add-btn" onClick={() => addToCart(item)} aria-label={`Add ${item.name}`}>Add +</button>
                  </div>
                </div>
                {open ? (
                  <Reviews
                    itemId={item.id}
                    reviews={rv}
                    onAdded={() => refreshItemReviews(item.id)}
                    onNeedAuth={onNeedAuth}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}
