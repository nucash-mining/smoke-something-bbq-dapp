// Auth abstraction. Works against Supabase when configured, else an offline
// localStorage "demo" backend so the app is fully clickable without a server.
//
// Session shape used across the UI:
//   { kind: 'user' | 'guest' | 'wallet', id, email, displayName, walletAddress }
//   (null = signed out)

import { supabase } from './supabaseClient.js'
import { isSupabaseConfigured } from '../config.js'
import { connectWallet } from './web3.js'

const LS_USERS = 'ssbbq_demo_users'
const LS_SESSION = 'ssbbq_session'

const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// Lightweight pub/sub for demo-mode session changes.
const listeners = new Set()
const emit = (s) => listeners.forEach((cb) => cb(s))

function setDemoSession(s) {
  if (s) write(LS_SESSION, s)
  else localStorage.removeItem(LS_SESSION)
  emit(s)
}

// ---------- public API ----------

export async function getSession() {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession()
    return sessionFromSupabase(data?.session)
  }
  return read(LS_SESSION, null)
}

export function onAuthChange(cb) {
  if (isSupabaseConfigured) {
    const { data } = supabase.auth.onAuthStateChange((_e, session) =>
      cb(sessionFromSupabase(session))
    )
    return () => data.subscription.unsubscribe()
  }
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function signUpEmail({ email, password, name }) {
  email = email.trim().toLowerCase()
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name || email.split('@')[0] } },
    })
    if (error) throw error
    // If confirmations are off, a session is returned immediately.
    if (!data.session) {
      return { needsConfirmation: true }
    }
    return { session: sessionFromSupabase(data.session) }
  }
  // demo
  const users = read(LS_USERS, {})
  if (users[email]) throw new Error('An account with that email already exists.')
  const id = 'u_' + crypto.randomUUID()
  users[email] = { id, email, password, name: name || email.split('@')[0], points: 0 }
  write(LS_USERS, users)
  const s = { kind: 'user', id, email, displayName: users[email].name }
  setDemoSession(s)
  return { session: s }
}

export async function signInEmail({ email, password }) {
  email = email.trim().toLowerCase()
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { session: sessionFromSupabase(data.session) }
  }
  const users = read(LS_USERS, {})
  const u = users[email]
  if (!u || u.password !== password) throw new Error('Wrong email or password.')
  const s = { kind: 'user', id: u.id, email, displayName: u.name }
  setDemoSession(s)
  return { session: s }
}

export function continueAsGuest(name) {
  const s = {
    kind: 'guest',
    id: 'g_' + (crypto.randomUUID?.() || Date.now()),
    email: null,
    displayName: name?.trim() || 'Guest',
    walletAddress: null,
  }
  if (!isSupabaseConfigured) setDemoSession(s)
  else write(LS_SESSION, s) // guests aren't a Supabase auth concept; keep locally
  emit(s)
  return s
}

// Connect an EVM wallet, prove ownership with a signature, and sign in.
export async function signInWallet() {
  const { provider, address } = await connectWallet()
  const signer = await provider.getSigner()
  const message = `Sign in to Smoke Something BBQ\nWallet: ${address}\nTime: ${new Date().toISOString()}`
  await signer.signMessage(message) // proves the user controls the wallet
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`

  if (isSupabaseConfigured) {
    // Map the wallet to a deterministic Supabase credential so the customer
    // gets a real, cross-device account with server-side points.
    // NOTE: requires "Confirm email" turned OFF in Supabase Auth settings.
    const synthEmail = `${address.toLowerCase()}@wallet.smokesomethingbbq.app`
    const synthPass = `w_${address.toLowerCase()}` // gated by the signature above
    let res = await supabase.auth.signInWithPassword({ email: synthEmail, password: synthPass })
    if (res.error) {
      const up = await supabase.auth.signUp({
        email: synthEmail,
        password: synthPass,
        options: { data: { display_name: short, wallet_address: address } },
      })
      if (up.error) throw up.error
      res = await supabase.auth.signInWithPassword({ email: synthEmail, password: synthPass })
      if (res.error) {
        throw new Error(
          'Wallet account created but sign-in is blocked — turn off "Confirm email" in your Supabase Auth settings to enable wallet login.'
        )
      }
    }
    const s = sessionFromSupabase(res.data.session)
    return { ...s, kind: 'wallet', walletAddress: address, displayName: short }
  }

  // demo
  const id = 'w_' + address.toLowerCase()
  const users = read(LS_USERS, {})
  if (!users[id]) {
    users[id] = { id, email: null, name: short, walletAddress: address, points: 0 }
    write(LS_USERS, users)
  }
  const s = { kind: 'wallet', id, email: null, displayName: short, walletAddress: address }
  setDemoSession(s)
  return s
}

export async function signOut() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut()
    localStorage.removeItem(LS_SESSION)
  }
  setDemoSession(null)
}

// ---------- helpers ----------

function sessionFromSupabase(session) {
  if (!session?.user) return read(LS_SESSION, null) // may be a local guest
  const u = session.user
  const meta = u.user_metadata || {}
  const isWallet = (u.email || '').endsWith('@wallet.smokesomethingbbq.app')
  return {
    kind: isWallet ? 'wallet' : 'user',
    id: u.id,
    email: isWallet ? null : u.email,
    displayName: meta.display_name || (u.email || '').split('@')[0],
    walletAddress: meta.wallet_address || null,
  }
}
