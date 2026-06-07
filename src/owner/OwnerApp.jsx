import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import AuthPanel from '../auth/AuthPanel.jsx'
import OrdersBoard from './OrdersBoard.jsx'
import QRScanner from './QRScanner.jsx'
import MenuEditor from './MenuEditor.jsx'
import LocationBroadcast from './LocationBroadcast.jsx'
import PaymentsEditor from './PaymentsEditor.jsx'
import { business, env, isSupabaseConfigured } from '../config.js'

const DEMO_KEY = 'ssbbq_owner_unlocked'

const TABS = [
  ['orders', 'Orders'],
  ['scan', 'Scan cash'],
  ['menu', 'Menu'],
  ['payments', 'Payments'],
  ['location', 'Location'],
]

export default function OwnerApp() {
  const { session, isOwner, signOut } = useSession()
  const [tab, setTab] = useState('orders')
  const [refreshKey, setRefreshKey] = useState(0)
  const [demoUnlocked, setDemoUnlocked] = useState(() => localStorage.getItem(DEMO_KEY) === '1')
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState(null)

  // ---- access gate ----
  // You're the owner if you're signed in with the owner email (works in both
  // demo and Supabase). In demo mode, the passcode is an extra fallback.
  const allowed = isOwner || (!isSupabaseConfigured && demoUnlocked)

  if (!allowed) {
    const wrongAccount = session && session.kind !== 'guest' && !isOwner
    return (
      <div className="app">
        <div className="account-bar"><Link to="/" className="link-btn">← Customer view</Link></div>
        <header className="header"><h1>{business.name}</h1><p className="tagline">Owner sign in</p></header>

        {wrongAccount ? (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="status err">
              You're signed in as {session.email || 'this account'}, which isn't the owner
              {env.ownerEmail ? ` (${env.ownerEmail})` : ''}. Sign out and use the owner account.
            </div>
            <button className="btn secondary" style={{ marginTop: 12 }} onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <>
            <p className="m-sub" style={{ textAlign: 'center', marginTop: 16 }}>
              Sign in with the owner email{env.ownerEmail ? <> <strong>({env.ownerEmail})</strong></> : null} to manage orders, menu, payments &amp; location.
            </p>
            <div style={{ marginTop: 8 }}>
              <AuthPanel allowGuest={false} title="Owner sign in" onClose={null} />
            </div>

            {!isSupabaseConfigured ? (
              <div className="card" style={{ marginTop: 16 }}>
                <h3 className="cat-title">Or use the demo passcode</h3>
                <p className="m-sub">Offline demo only. Passcode: <code>{env.demoOwnerPasscode}</code></p>
                <input className="field" type="password" placeholder="Passcode" value={code}
                  onChange={(e) => setCode(e.target.value)} />
                <button className="btn" onClick={() => {
                  if (code === env.demoOwnerPasscode) { localStorage.setItem(DEMO_KEY, '1'); setDemoUnlocked(true) }
                  else setCodeErr('Wrong passcode.')
                }}>Unlock dashboard</button>
                {codeErr ? <div className="status err">{codeErr}</div> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    )
  }

  // ---- dashboard ----
  function lock() {
    localStorage.removeItem(DEMO_KEY); setDemoUnlocked(false)
    if (session) signOut()
  }

  return (
    <div className="app">
      <div className="account-bar">
        <Link to="/" className="link-btn">← Customer view</Link>
        <button className="link-btn" onClick={lock}>Lock dashboard</button>
      </div>

      <header className="header"><h1>{business.name}</h1><p className="tagline">Owner dashboard</p></header>

      <div className="tabs">
        {TABS.map(([t, label]) => (
          <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      <div className="section">
        {tab === 'orders' ? <OrdersBoard refreshKey={refreshKey} /> : null}
        {tab === 'scan' ? <QRScanner onPaid={() => setRefreshKey((k) => k + 1)} /> : null}
        {tab === 'menu' ? <MenuEditor /> : null}
        {tab === 'payments' ? <PaymentsEditor /> : null}
        {tab === 'location' ? <LocationBroadcast /> : null}
      </div>
    </div>
  )
}
