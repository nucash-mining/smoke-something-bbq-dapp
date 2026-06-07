import { useEffect, useMemo, useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'
import { createOrder, getSettings } from '../lib/db.js'
import { fmtPrice } from '../config.js'
import { resolvePayments } from '../lib/merchant.js'
import { cashAppLink, payPalLink, venmoLink } from '../lib/payLinks.js'
import CashQR from './CashQR.jsx'
import CryptoPay from '../components/CryptoPay.jsx'

const META = {
  cash: { label: 'Cash (in person)', icon: '💵', bg: '#2e7d32' },
  cashapp: { label: 'Cash App', icon: '$', bg: '#00d54b' },
  paypal: { label: 'PayPal', icon: 'PP', bg: '#003087' },
  venmo: { label: 'Venmo', icon: 'V', bg: '#3d95ce' },
  crypto: { label: 'Crypto', icon: '◈', bg: '#e8521f' },
  gateway: { label: 'Card / hosted', icon: '◇', bg: '#555' },
}

export default function Checkout({ onNeedAuth }) {
  const { session, cart, subtotal, clearCart, refreshPoints } = useSession()
  const [pay, setPay] = useState(null)         // resolved merchant payment accounts
  const [method, setMethod] = useState('cash')
  const [placing, setPlacing] = useState(false)
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)

  // Load the owner's configured payment accounts.
  useEffect(() => {
    getSettings().then((s) => setPay(resolvePayments(s))).catch(() => setPay(resolvePayments({})))
  }, [])

  const methods = useMemo(() => {
    if (!pay) return [{ key: 'cash', ...META.cash }]
    return Object.keys(META)
      .filter((k) => pay[k]?.enabled)
      .map((k) => ({ key: k, ...META[k] }))
  }, [pay])

  if (cart.length === 0) return null

  async function placeOrder() {
    setErr(null)
    if (!session) { onNeedAuth && onNeedAuth(); return }
    try {
      setPlacing(true)
      const pm = methods.some((x) => x.key === method) ? method : (methods[0]?.key || 'cash')
      const o = await createOrder({ session, items: cart, subtotal, paymentMethod: pm })
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
    const m = order.payment_method
    return (
      <section className="section">
        <h2>Order placed ✔</h2>
        <div className="card">
          <p className="m-sub">Your order is in. Staff confirms payment — that's when your points are added.</p>

          {m === 'cash' ? <CashQR order={order} /> : null}
          {['cashapp', 'paypal', 'venmo'].includes(m) ? (
            <FiatPayNow method={m} amount={order.subtotal} pay={pay} />
          ) : null}
          {m === 'crypto' ? <CryptoPay amount={order.subtotal} receiveAddress={pay?.crypto?.address} /> : null}
          {m === 'gateway' && pay?.gateway?.url ? (
            <a className="btn" target="_blank" rel="noreferrer"
              href={pay.gateway.url.replace('{AMOUNT}', encodeURIComponent(order.subtotal))}
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Continue to {pay.gateway.provider}
            </a>
          ) : null}

          <button className="btn secondary" style={{ marginTop: 14 }} onClick={() => setOrder(null)}>
            Start another order
          </button>
        </div>
      </section>
    )
  }

  // ---- choose method + place ----
  // Fall back to the first available method if the selected one isn't offered.
  const activeMethod = methods.some((x) => x.key === method) ? method : (methods[0]?.key || 'cash')

  return (
    <section className="section">
      <h2>Checkout</h2>
      <div className="card">
        <div className="pay-grid">
          {methods.map((m) => (
            <button key={m.key} className={`pay-tile ${activeMethod === m.key ? 'on' : ''}`} onClick={() => setMethod(m.key)}>
              <span className="icon" style={{ background: m.bg }}>{m.icon}</span>
              <span className="m-name">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="checkout-total"><span>Total</span><span>{fmtPrice(subtotal)}</span></div>

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

// Single cash-app pay button for the chosen method, using the owner's handles.
function FiatPayNow({ method, amount, pay }) {
  const handle = pay?.[method]?.handle
  if (!handle) {
    return <div className="status err">This payment method isn't set up yet.</div>
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
