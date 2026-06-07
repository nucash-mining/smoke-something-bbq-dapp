import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { getOrderByToken, markOrderPaid } from '../lib/db.js'
import { fmtPrice } from '../config.js'

// Owner scans the customer's cash QR. We decode the claim token, look up the
// order, and let the owner confirm payment (which awards points).
export default function QRScanner({ onPaid }) {
  const [scanning, setScanning] = useState(false)
  const [order, setOrder] = useState(null)
  const [msg, setMsg] = useState(null)
  const scannerRef = useRef(null)
  const elId = 'qr-reader'

  async function start() {
    setMsg(null); setOrder(null); setScanning(true)
  }

  useEffect(() => {
    if (!scanning) return
    const html5 = new Html5Qrcode(elId)
    scannerRef.current = html5
    let stopped = false

    const onScan = async (text) => {
      if (stopped) return
      stopped = true
      try {
        const payload = JSON.parse(text)
        const tok = payload?.t
        if (!tok) throw new Error('Not a Smoke Something order code.')
        const o = await getOrderByToken(tok)
        if (!o) throw new Error('Order not found.')
        setOrder(o)
      } catch (e) {
        setMsg({ type: 'err', text: e.message || 'Could not read code.' })
      } finally {
        await stop()
      }
    }

    html5.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, onScan, () => {})
      .catch((e) => { setMsg({ type: 'err', text: e.message || 'Camera unavailable.' }); setScanning(false) })

    return () => { stopped = true; html5.isScanning && html5.stop().catch(() => {}) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning])

  async function stop() {
    try { if (scannerRef.current?.isScanning) await scannerRef.current.stop() } catch { /* */ }
    setScanning(false)
  }

  async function confirmPaid() {
    try {
      const updated = await markOrderPaid(order.id, 'cash')
      setOrder(updated)
      setMsg({ type: 'ok', text: `Paid · ${updated.points_awarded ? `+${updated.points_awarded} pts awarded` : 'logged'}` })
      onPaid && onPaid()
    } catch (e) { setMsg({ type: 'err', text: e.message }) }
  }

  return (
    <div className="card">
      <h3 className="cat-title">Scan cash payment</h3>
      {!scanning && !order ? (
        <button className="btn" onClick={start}>📷 Start camera scanner</button>
      ) : null}

      {scanning ? (
        <>
          <div id={elId} className="qr-reader" />
          <button className="btn secondary" style={{ marginTop: 10 }} onClick={stop}>Cancel</button>
        </>
      ) : null}

      {order ? (
        <div className="scan-result">
          <div className="cart-total"><span>Order #{String(order.id).slice(0, 8)}</span><span>{fmtPrice(order.subtotal)}</span></div>
          <ul className="scan-items">
            {(order.items || []).map((it, i) => (
              <li key={i}>{it.qty}× {it.name} {it.price != null ? `(${fmtPrice(it.price)})` : '(Ask)'}</li>
            ))}
          </ul>
          <div className="m-sub">
            Payment: <strong>{order.paid ? 'Paid ✓' : 'NOT PAID'}</strong>
            {order.guest_name ? ` · ${order.guest_name}` : ''}
          </div>
          {!order.paid ? (
            <button className="btn" style={{ marginTop: 10 }} onClick={confirmPaid}>Confirm cash received · {fmtPrice(order.subtotal)}</button>
          ) : null}
          <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => { setOrder(null); setMsg(null) }}>Scan another</button>
        </div>
      ) : null}

      {msg ? <div className={`status ${msg.type}`}>{msg.text}</div> : null}
    </div>
  )
}
