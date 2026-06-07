import { useCallback, useEffect, useState } from 'react'
import { getMyOrders, trackOrder } from '../lib/db.js'
import { useSession } from '../context/SessionContext.jsx'
import { fmtPrice } from '../config.js'
import { FULFILL_STEPS, FULFILL_LABEL, fmtDateTime } from '../lib/orders.js'
import CashQR from './CashQR.jsx'

function readRefs() {
  try { return JSON.parse(localStorage.getItem('ssbbq_my_order_refs') || '[]') } catch { return [] }
}

// Status timeline shown to the customer for one order.
function Timeline({ status }) {
  if (status === 'cancelled') {
    return <div className="status err" style={{ marginTop: 8 }}>This order was cancelled.</div>
  }
  const current = FULFILL_STEPS.indexOf(status)
  return (
    <div className="timeline">
      {FULFILL_STEPS.map((s, i) => (
        <div key={s} className={`tl-step ${i <= current ? 'done' : ''} ${i === current ? 'now' : ''}`}>
          <span className="tl-dot" />
          <span className="tl-label">{FULFILL_LABEL[s]}</span>
        </div>
      ))}
    </div>
  )
}

export default function MyOrders() {
  const { session } = useSession()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const byId = new Map()
    // 1) signed-in users: authoritative server/local list
    if (session && session.kind !== 'guest') {
      try { (await getMyOrders(session)).forEach((o) => byId.set(o.id, o)) } catch { /* */ }
    }
    // 2) anything placed on this device (covers guests)
    const refs = readRefs()
    await Promise.all(
      refs.map(async (r) => {
        if (byId.has(r.id)) return
        try { const o = await trackOrder(r.token); if (o) byId.set(o.id, o) } catch { /* */ }
      })
    )
    const list = [...byId.values()].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )
    setOrders(list)
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
    const onChange = () => load()
    window.addEventListener('ssbbq-orders-changed', onChange)
    const t = setInterval(load, 15000) // live-ish status updates
    return () => { window.removeEventListener('ssbbq-orders-changed', onChange); clearInterval(t) }
  }, [load])

  // Hide the whole section if there's nothing to show.
  if (!loading && orders.length === 0) return null

  return (
    <section className="section">
      <h2>Your orders</h2>
      {loading ? (
        <div className="card"><p className="m-sub">Loading your orders…</p></div>
      ) : orders.map((o) => {
        const unpaidCash = !o.paid && o.payment_method === 'cash'
        return (
          <div className="card my-order" key={o.id}>
            <div className="mo-head">
              <span className="mo-id">#{String(o.id).slice(0, 8)}</span>
              <span className={`pay-badge ${o.paid ? 'paid' : 'unpaid'}`}>
                {o.paid ? '✓ Paid' : 'NOT PAID'}
              </span>
            </div>

            <ul className="mo-itemlist">
              {(o.items || []).map((it, i) => (
                <li key={i}>
                  <span>{it.qty}× {it.name}</span>
                  <span>{it.price == null ? 'Ask' : fmtPrice(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="cart-total" style={{ fontSize: '1rem' }}>
              <span>Total</span><span>{fmtPrice(o.subtotal)}</span>
            </div>

            <div className="mo-times">
              <div><span className="mo-tlabel">Ordered</span><span>{fmtDateTime(o.created_at)}</span></div>
              {o.picked_up_at ? (
                <div><span className="mo-tlabel">Picked up</span><span>{fmtDateTime(o.picked_up_at)}</span></div>
              ) : null}
              {o.paid_at ? (
                <div><span className="mo-tlabel">Paid</span><span>{fmtDateTime(o.paid_at)}</span></div>
              ) : null}
            </div>

            <Timeline status={o.status} />

            {o.status === 'ready' && !o.paid ? (
              <div className="status" style={{ borderColor: 'var(--good)' }}>
                🍽️ Your order is ready! {unpaidCash ? 'Pay cash at pickup.' : 'Payment still pending.'}
              </div>
            ) : null}

            {unpaidCash && o.status !== 'completed' && o.claim_token ? (
              <details className="cash-reshow">
                <summary>Show cash payment QR</summary>
                <CashQR order={o} />
              </details>
            ) : null}

            {o.status === 'completed' ? (
              <div className="status ok">Picked up{o.paid ? ' · paid' : ''}. Thanks! 🐖🔥</div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
