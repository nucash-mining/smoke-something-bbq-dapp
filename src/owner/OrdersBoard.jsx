import { useCallback, useEffect, useState } from 'react'
import { listOrders, markOrderPaid } from '../lib/db.js'
import { fmtPrice } from '../config.js'

const STATUS_COLORS = { pending: '#e0a92e', paid: '#4caf7d', fulfilled: '#627eea', cancelled: '#b3493a' }

export default function OrdersBoard({ refreshKey }) {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [err, setErr] = useState(null)

  const load = useCallback(() => {
    listOrders().then(setOrders).catch((e) => setErr(e.message))
  }, [])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t) }, [load]) // live-ish

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  async function setPaid(o) {
    try { await markOrderPaid(o.id, o.payment_method); load() }
    catch (e) { setErr(e.message) }
  }

  return (
    <div className="card">
      <div className="loc-head">
        <h3 className="cat-title" style={{ margin: 0 }}>Orders</h3>
        <select className="field" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
      </div>

      {err ? <div className="status err">{err}</div> : null}
      {shown.length === 0 ? <p className="m-sub">No orders yet.</p> : null}

      {shown.map((o) => (
        <div className="order-row" key={o.id}>
          <div className="or-main">
            <div className="or-id">
              #{String(o.id).slice(0, 8)}
              <span className="badge" style={{ background: STATUS_COLORS[o.status] || '#555' }}>{o.status}</span>
              <span className="m-sub"> · {o.payment_method || '—'}</span>
            </div>
            <div className="or-items">
              {(o.items || []).map((it, i) => (
                <span key={i}>{it.qty}× {it.name}{i < o.items.length - 1 ? ', ' : ''}</span>
              ))}
            </div>
            <div className="m-sub">{o.guest_name ? `${o.guest_name} · ` : ''}{new Date(o.created_at).toLocaleString()}</div>
          </div>
          <div className="or-right">
            <div className="or-total">{fmtPrice(o.subtotal)}</div>
            {o.status === 'pending' ? (
              <button className="add-btn" onClick={() => setPaid(o)}>Mark paid</button>
            ) : o.points_awarded ? <span className="m-sub">+{o.points_awarded} pts</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
