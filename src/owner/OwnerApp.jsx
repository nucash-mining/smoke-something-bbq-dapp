import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import AuthPanel from '../auth/AuthPanel.jsx'
import OrdersBoard from './OrdersBoard.jsx'
import QRScanner from './QRScanner.jsx'
import MenuEditor from './MenuEditor.jsx'
import LocationBroadcast from './LocationBroadcast.jsx'
import { business, env, isSupabaseConfigured } from '../config.js'

const DEMO_KEY = 'ssbbq_owner_unlocked'

export default function OwnerApp() {
  const { session, isOwner, signOut } = useSession()
  const [tab, setTab] = useState('orders')
  const [refreshKey, setRefreshKey] = useState(0)
  const [demoUnlocked, setDemoUnlocked] = useState(() => localStorage.getItem(DEMO_KEY) === '1')
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState(null)

  // ---- access gate ----
  // Live (Supabase): must be signed in with the owner email.
  // Demo (no Supabase): unlock with the demo passcode.
  const allowed = isSupabaseConfigured ? isOwner : demoUnlocked

  if (!allowed) {
    return (
      <div className="app">
        <div className="account-bar"><Link to="/" className="link-btn">← Customer view</Link></div>
        <header className="header"><h1>{business.name}</h1><p className="tagline">Owner dashboard</p></header>

        {isSupabaseConfigured ? (
          session && !isOwner ? (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="status err">
                Signed in as {session.email || 'this account'}, which isn't the owner email
                {env.ownerEmail ? ` (${env.ownerEmail})` : ''}.
              </div>
              <button className="btn secondary" style={{ marginTop: 12 }} onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <div style={{ marginTop: 20 }}>
              <AuthPanel allowGuest={false} title="Owner sign in" onClose={null} />
            </div>
          )
        ) : (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 className="cat-title">Enter owner passcode</h3>
            <p className="m-sub">Demo mode. Default passcode is <code>{env.demoOwnerPasscode}</code> (set <code>VITE_DEMO_OWNER_PASSCODE</code> to change).</p>
            <input className="field" type="password" placeholder="Passcode" value={code}
              onChange={(e) => setCode(e.target.value)} />
            <button className="btn" onClick={() => {
              if (code === env.demoOwnerPasscode) { localStorage.setItem(DEMO_KEY, '1'); setDemoUnlocked(true) }
              else setCodeErr('Wrong passcode.')
            }}>Unlock dashboard</button>
            {codeErr ? <div className="status err">{codeErr}</div> : null}
          </div>
        )}
      </div>
    )
  }

  // ---- dashboard ----
  function lock() {
    if (isSupabaseConfigured) signOut()
    else { localStorage.removeItem(DEMO_KEY); setDemoUnlocked(false) }
  }

  return (
    <div className="app">
      <div className="account-bar">
        <Link to="/" className="link-btn">← Customer view</Link>
        <button className="link-btn" onClick={lock}>Lock dashboard</button>
      </div>

      <header className="header"><h1>{business.name}</h1><p className="tagline">Owner dashboard</p></header>

      <div className="tabs">
        {['orders', 'scan', 'menu', 'location'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t === 'orders' ? 'Orders' : t === 'scan' ? 'Scan cash' : t === 'menu' ? 'Menu' : 'Location'}
          </button>
        ))}
      </div>

      <div className="section">
        {tab === 'orders' ? <OrdersBoard refreshKey={refreshKey} /> : null}
        {tab === 'scan' ? <QRScanner onPaid={() => setRefreshKey((k) => k + 1)} /> : null}
        {tab === 'menu' ? <MenuEditor /> : null}
        {tab === 'location' ? <LocationBroadcast /> : null}
      </div>
    </div>
  )
}
