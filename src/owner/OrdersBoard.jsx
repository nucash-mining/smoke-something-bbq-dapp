import { useCallback, useEffect, useState } from 'react'
import { listOrders, markOrderPaid, setOrderStatus } from '../lib/db.js'
import { fmtPrice } from '../config.js'
import { FULFILL_LABEL, FULFILL_COLOR, nextFulfill, ADVANCE_LABEL, fmtDateTime } from '../lib/orders.js'

export default function OrdersBoard({ refreshKey }) {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('active') // active | unpaid | all | completed
  const [err, setErr] = useState(null)

  const load = useCallback(() => {
    listOrders().then(setOrders).catch((e) => setErr(e.message))
  }, [])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => { const t = setInterval(load, 12000); return () => clearInterval(t) }, [load]) // live-ish

  const shown = orders.filter((o) => {
    if (filter === 'all') return true
    if (filter === 'unpaid') return !o.paid
    if (filter === 'completed') return o.status === 'completed'
    return o.status !== 'completed' && o.status !== 'cancelled' // active
  })

  async function pay(o) {
    try { await markOrderPaid(o.id, o.payment_method); load() } catch (e) { setErr(e.message) }
  }
  async function advance(o) {
    const next = nextFulfill(o.status)
    if (!next) return
    try { await setOrderStatus(o.id, next); load() } catch (e) { setErr(e.message) }
  }
  async function cancel(o) {
    if (!confirm('Cancel this order?')) return
    try { await setOrderStatus(o.id, 'cancelled'); load() } catch (e) { setErr(e.message) }
  }

  return (
    <div className="card">
      <div className="loc-head">
        <h3 className="cat-title" style={{ margin: 0 }}>Orders</h3>
        <select className="field" style={{ width: 'auto', margin: 0 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="unpaid">Unpaid</option>
          <option value="completed">Completed</option>
          <option value="all">All</option>
        </select>
      </div>

      {err ? <div className="status err">{err}</div> : null}
      {shown.length === 0 ? <p className="m-sub">No orders here.</p> : null}

      {shown.map((o) => {
        const next = nextFulfill(o.status)
        return (
          <div className="order-card" key={o.id}>
            <div className="oc-top">
              <span className="oc-id">#{String(o.id).slice(0, 8)}</span>
              <span className="badge" style={{ background: FULFILL_COLOR[o.status] || '#555' }}>
                {FULFILL_LABEL[o.status] || o.status}
              </span>
              <span className={`pay-badge ${o.paid ? 'paid' : 'unpaid'}`}>
                {o.paid ? '✓ Paid' : 'NOT PAID'}
              </span>
              <span className="m-sub">· {o.payment_method || '—'}</span>
            </div>

            <ul className="oc-items">
              {(o.items || []).map((it, i) => (
                <li key={i}>
                  <span>{it.qty}× {it.name}</span>
                  <span>{it.price == null ? 'Ask' : fmtPrice(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="oc-total"><span>Total</span><span>{fmtPrice(o.subtotal)}</span></div>

            <div className="oc-times">
              <div><span className="mo-tlabel">Ordered</span><span>{fmtDateTime(o.created_at)}</span></div>
              {o.paid_at ? <div><span className="mo-tlabel">Paid</span><span>{fmtDateTime(o.paid_at)}</span></div> : null}
              {o.picked_up_at ? <div><span className="mo-tlabel">Picked up</span><span>{fmtDateTime(o.picked_up_at)}</span></div> : null}
              {o.guest_name ? <div><span className="mo-tlabel">Name</span><span>{o.guest_name}</span></div> : null}
            </div>

            {o.status !== 'cancelled' ? (
              <div className="oc-actions">
                {!o.paid ? (
                  <button className="btn" style={{ margin: 0 }} onClick={() => pay(o)}>
                    Mark paid · {fmtPrice(o.subtotal)}
                  </button>
                ) : null}
                {next ? (
                  <button className="btn secondary" style={{ margin: 0 }} onClick={() => advance(o)}>
                    {ADVANCE_LABEL[next]}
                  </button>
                ) : null}
                {o.status !== 'completed' ? (
                  <button className="link-btn" onClick={() => cancel(o)}>Cancel</button>
                ) : null}
              </div>
            ) : null}

            {o.points_awarded ? <div className="m-sub" style={{ marginTop: 6 }}>+{o.points_awarded} pts awarded</div> : null}
          </div>
        )
      })}
    </div>
  )
}
