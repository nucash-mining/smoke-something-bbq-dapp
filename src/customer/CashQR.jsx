import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { fmtPrice } from '../config.js'

// Renders the QR the customer shows staff when paying cash in person.
// Encodes the order's claim token; the owner's scanner looks it up and marks paid.
export default function CashQR({ order }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    if (!order) return
    const payload = JSON.stringify({
      v: 1,
      type: 'ssbbq-order',
      id: order.id,
      t: order.claim_token,
      amt: order.subtotal,
    })
    QRCode.toDataURL(payload, { width: 280, margin: 2, color: { dark: '#140f0c', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [order])

  return (
    <div className="cashqr">
      <p className="m-sub">Pay <strong>{fmtPrice(order.subtotal)}</strong> in cash and show this code to staff. They'll scan it to confirm your order{order.user_id ? ' and add your points' : ''}.</p>
      {dataUrl ? <img src={dataUrl} alt="Cash payment QR code" className="qr-img" /> : <p>Generating code…</p>}
      <p className="qr-id">Order #{String(order.id).slice(0, 8)}</p>
    </div>
  )
}
