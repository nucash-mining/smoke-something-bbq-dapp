import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/db.js'

// Owner enters the payment accounts customers pay into. Saved to settings so the
// checkout offers exactly the methods that are set up (no code editing needed).
const FIELDS = [
  { key: 'cashapp_tag', label: 'Cash App $Cashtag', prefix: '$', placeholder: 'SmokeSomethingBBQ', hint: 'Without the $' },
  { key: 'venmo_handle', label: 'Venmo username', prefix: '@', placeholder: 'SmokeSomethingBBQ', hint: 'Without the @' },
  { key: 'paypal_handle', label: 'PayPal.Me name', prefix: 'paypal.me/', placeholder: 'SmokeSomethingBBQ', hint: 'Your PayPal.Me link name' },
  { key: 'crypto_address', label: 'Crypto receive wallet (EVM)', prefix: '', placeholder: '0x…', hint: 'One 0x… address; works on ALT, WATTx, ETH, Polygon, BNB' },
  { key: 'gateway_url', label: 'Hosted crypto checkout URL (optional)', prefix: '', placeholder: 'https://cryptopaymentgateway.com/pay/ID?amount={AMOUNT}', hint: '{AMOUNT} is replaced at checkout' },
]

export default function PaymentsEditor() {
  const [vals, setVals] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getSettings().then((s) => {
      setVals(Object.fromEntries(FIELDS.map((f) => [f.key, s?.[f.key] || ''])))
    }).finally(() => setLoading(false))
  }, [])

  async function save(e) {
    e.preventDefault()
    setMsg(null); setSaving(true)
    try {
      const patch = Object.fromEntries(FIELDS.map((f) => [f.key, (vals[f.key] || '').trim()]))
      // normalize: strip leading $ / @ / paypal.me/
      patch.cashapp_tag = patch.cashapp_tag.replace(/^\$/, '')
      patch.venmo_handle = patch.venmo_handle.replace(/^@/, '')
      patch.paypal_handle = patch.paypal_handle.replace(/^.*paypal\.me\//i, '')
      await saveSettings(patch)
      setVals((v) => ({ ...v, ...patch }))
      setMsg({ type: 'ok', text: 'Payment accounts saved. Customers will see these at checkout.' })
    } catch (e2) { setMsg({ type: 'err', text: e2.message }) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="card"><p className="m-sub">Loading…</p></div>

  return (
    <div className="card">
      <h3 className="cat-title">Payment accounts</h3>
      <p className="m-sub" style={{ marginBottom: 14 }}>
        Enter the accounts customers pay into. Leave a field blank to hide that
        method at checkout. Cash (in person) is always available.
      </p>
      <form onSubmit={save}>
        {FIELDS.map((f) => (
          <label key={f.key} className="pay-field">
            <span className="pf-label">{f.label}</span>
            <span className="pf-input">
              {f.prefix ? <span className="pf-prefix">{f.prefix}</span> : null}
              <input
                className="field" style={{ margin: 0 }}
                placeholder={f.placeholder}
                value={vals[f.key] || ''}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              />
            </span>
            <span className="pf-hint">{f.hint}</span>
          </label>
        ))}
        <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save payment accounts'}</button>
        {msg ? <div className={`status ${msg.type}`}>{msg.text}</div> : null}
      </form>
    </div>
  )
}
