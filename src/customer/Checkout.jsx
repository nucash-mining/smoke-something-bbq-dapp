import { useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'
import { createOrder } from '../lib/db.js'
import { fiat, crypto as cryptoCfg, gateway, fmtPrice, isPlaceholder } from '../config.js'
import { cashAppLink, payPalLink, venmoLink } from '../lib/payLinks.js'
import CashQR from './CashQR.jsx'
import CryptoPay from '../components/CryptoPay.jsx'
import GatewayPay from '../components/GatewayPay.jsx'

// Build the list of payment methods the owner has enabled.
function methodList() {
  const m = [{ key: 'cash', label: 'Cash (in person)', icon: '💵', bg: '#2e7d32' }]
  if (fiat.cashapp?.enabled) m.push({ key: 'cashapp', label: 'Cash App', icon: '$', bg: '#00d54b' })
  if (fiat.paypal?.enabled) m.push({ key: 'paypal', label: 'PayPal', icon: 'PP', bg: '#003087' })
  if (fiat.venmo?.enabled) m.push({ key: 'venmo', label: 'Venmo', icon: 'V', bg: '#3d95ce' })
  if (cryptoCfg.enabled) m.push({ key: 'crypto', label: 'Crypto', icon: '◈', bg: '#e8521f' })
  if (gateway.enabled) m.push({ key: 'gateway', label: gateway.provider, icon: '◇', bg: '#555' })
  return m
}

export default function Checkout({ onNeedAuth }) {
  const { session, cart, subtotal, clearCart, refreshPoints } = useSession()
  const [method, setMethod] = useState('cash')
  const [placing, setPlacing] = useState(false)
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)

  if (cart.length === 0) return null
  const methods = methodList()

  async function placeOrder() {
    setErr(null)
    if (!session) { onNeedAuth && onNeedAuth(); return }
    try {
      setPlacing(true)
      const o = await createOrder({
        session,
        items: cart,
        subtotal,
        paymentMethod: method,
      })
      // Save a reference so this device can track the order (incl. guests).
      try {
        const refs = JSON.parse(localStorage.getItem('ssbbq_my_order_refs') || '[]')
        refs.unshift({ id: o.id, token: o.claim_token, at: Date.now() })
        localStorage.setItem('ssbbq_my_order_refs', JSON.stringify(refs.slice(0, 25)))
      } catch { /* ignore */ }
      window.dispatchEvent(new Event('ssbbq-orders-changed'))
      setOrder(o)
      clearCart()
      refreshPoints()
    } catch (e) {
      setErr(e.message || 'Could not place your order.')
    } finally { setPlacing(false) }
  }

  // ---- after the order is placed: show how to pay ----
  if (order) {
    return (
      <section className="section">
        <h2>Order placed ✔</h2>
        <div className="card">
          <p className="m-sub">Your order is in. {order.status === 'pending' ? 'Payment is confirmed by staff.' : ''}</p>

          {order.payment_method === 'cash' ? (
            <CashQR order={order} />
          ) : null}

          {['cashapp', 'paypal', 'venmo'].includes(order.payment_method) ? (
            <FiatPayNow method={order.payment_method} amount={order.subtotal} />
          ) : null}

          {order.payment_method === 'crypto' ? <CryptoPay amount={order.subtotal} /> : null}
          {order.payment_method === 'gateway' ? <GatewayPay amount={order.subtotal} /> : null}

          <button className="btn secondary" style={{ marginTop: 14 }} onClick={() => setOrder(null)}>
            Start another order
          </button>
        </div>
      </section>
    )
  }

  // ---- choose method + place ----
  return (
    <section className="section">
      <h2>Checkout</h2>
      <div className="card">
        <div className="pay-grid">
          {methods.map((m) => (
            <button
              key={m.key}
              className={`pay-tile ${method === m.key ? 'on' : ''}`}
              onClick={() => setMethod(m.key)}
            >
              <span className="icon" style={{ background: m.bg }}>{m.icon}</span>
              <span className="m-name">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="checkout-total">
          <span>Total</span><span>{fmtPrice(subtotal)}</span>
        </div>

        <button className="btn" onClick={placeOrder} disabled={placing}>
          {placing ? 'Placing…' : session ? `Place order · ${fmtPrice(subtotal)}` : 'Sign in / guest to order'}
        </button>

        {err ? <div className="status err">{err}</div> : null}
        <p className="hint" style={{ marginTop: 10 }}>
          Staff confirms payment when you pick up — that's when loyalty points are added.
        </p>
      </div>
    </section>
  )
}

// Single cash-app pay button for the chosen method.
function FiatPayNow({ method, amount }) {
  const cfg = fiat[method]
  const handle = method === 'cashapp' ? cfg?.cashtag : cfg?.handle
  if (isPlaceholder(handle)) {
    return <div className="status err">This payment method isn't set up yet (missing handle in config).</div>
  }
  const url =
    method === 'cashapp' ? cashAppLink(handle, amount)
    : method === 'paypal' ? payPalLink(handle, amount)
    : venmoLink(handle, amount)
  const label = method === 'cashapp' ? 'Cash App' : method === 'paypal' ? 'PayPal' : 'Venmo'
  return (
    <a className="btn" href={url} target="_blank" rel="noreferrer"
      style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
      Pay {fmtPrice(amount)} with {label}
    </a>
  )
}
