import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import LocationCard from './LocationCard.jsx'
import Menu from './Menu.jsx'
import Cart from './Cart.jsx'
import Checkout from './Checkout.jsx'
import AuthPanel from '../auth/AuthPanel.jsx'
import { useSession } from '../context/SessionContext.jsx'
import { business, loyalty, isSupabaseConfigured } from '../config.js'

export default function CustomerApp() {
  const { session, points, cartCount, signOut } = useSession()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="app">
      {!isSupabaseConfigured ? (
        <div className="demo-banner">
          Demo mode — data is saved in this browser only. Add Supabase keys in <code>.env</code> to go live.
        </div>
      ) : null}

      {/* account bar */}
      <div className="account-bar">
        {session ? (
          <>
            <span className="who">
              {session.kind === 'guest' ? '👤 Guest' : `👋 ${session.displayName}`}
              {loyalty.enabled && session.kind !== 'guest'
                ? <span className="pts">⭐ {points} pts</span> : null}
            </span>
            <button className="link-btn" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <button className="link-btn strong" onClick={() => setAuthOpen(true)}>Sign in / Create account</button>
        )}
      </div>

      <Header />

      {cartCount > 0 ? <div className="cart-pill">🛒 {cartCount} item{cartCount > 1 ? 's' : ''} in your order</div> : null}

      <LocationCard />
      <Menu onNeedAuth={() => setAuthOpen(true)} />
      <Cart />
      <Checkout onNeedAuth={() => setAuthOpen(true)} />

      <footer className="footer">
        {business.name}
        <br />
        <a href={business.facebook} target="_blank" rel="noreferrer" style={{ color: 'var(--ember-2)' }}>
          facebook.com/SmokeSomethingBbq
        </a>
        <br />
        <Link to="/admin" className="owner-link">Owner login →</Link>
      </footer>

      {authOpen ? <AuthPanel onClose={() => setAuthOpen(false)} /> : null}
    </div>
  )
}
