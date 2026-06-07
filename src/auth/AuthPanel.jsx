import { useState } from 'react'
import { signInEmail, signUpEmail, signInWallet, continueAsGuest } from '../lib/auth.js'
import { useSession } from '../context/SessionContext.jsx'
import { hasWallet } from '../lib/web3.js'

// Modal-ish card for signing in. `allowGuest` hides the guest option in owner UI.
export default function AuthPanel({ onClose, allowGuest = true, title = 'Sign in' }) {
  const { setSession } = useSession()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const done = (s) => { if (s) setSession(s); onClose && onClose() }

  async function handleEmail(e) {
    e.preventDefault()
    setMsg(null); setBusy(true)
    try {
      const res = mode === 'signup'
        ? await signUpEmail({ email, password, name })
        : await signInEmail({ email, password })
      if (res.needsConfirmation) {
        setMsg({ type: 'ok', text: 'Check your email to confirm your account, then sign in.' })
        setMode('signin')
      } else {
        done(res.session)
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Could not sign in.' })
    } finally { setBusy(false) }
  }

  async function handleWallet() {
    setMsg(null); setBusy(true)
    try { done(await signInWallet()) }
    catch (err) { setMsg({ type: 'err', text: err.message || 'Wallet sign-in failed.' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          {onClose ? <button className="x" onClick={onClose} aria-label="Close">×</button> : null}
        </div>

        <div className="seg">
          <button className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>Sign in</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Create account</button>
        </div>

        <form onSubmit={handleEmail}>
          {mode === 'signup' ? (
            <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          ) : null}
          <input className="field" type="email" placeholder="Email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="btn" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <button className="btn secondary" onClick={handleWallet} disabled={busy}>
          {hasWallet() ? 'Continue with EVM wallet' : 'Connect EVM wallet'}
        </button>

        {allowGuest ? (
          <div className="guest">
            <input className="field" placeholder="Name (optional)" value={guestName}
              onChange={(e) => setGuestName(e.target.value)} />
            <button className="btn secondary" onClick={() => done(continueAsGuest(guestName))} disabled={busy}>
              Continue as guest
            </button>
          </div>
        ) : null}

        <p className="hint">
          Social logins (Google, Facebook, X) can be added later — they each need a
          developer app registered with that provider.
        </p>

        {msg ? <div className={`status ${msg.type}`}>{msg.text}</div> : null}
      </div>
    </div>
  )
}
