import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getSession, onAuthChange, signOut as authSignOut } from '../lib/auth.js'
import { getPoints } from '../lib/db.js'
import { env } from '../config.js'

const Ctx = createContext(null)
export const useSession = () => useContext(Ctx)

const CART_KEY = 'ssbbq_cart'
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) ?? [] } catch { return [] }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [cart, setCart] = useState(loadCart)

  // hydrate + subscribe to auth
  useEffect(() => {
    let active = true
    getSession().then((s) => { if (active) { setSession(s); setLoading(false) } })
    const unsub = onAuthChange((s) => setSession(s))
    return () => { active = false; unsub && unsub() }
  }, [])

  // refresh points whenever the user changes
  const refreshPoints = useCallback(async () => {
    if (!session || session.kind === 'guest') { setPoints(0); return }
    try { setPoints(await getPoints(session)) } catch { /* ignore */ }
  }, [session])
  useEffect(() => { refreshPoints() }, [refreshPoints])

  // persist cart
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])

  const isOwner = useMemo(() => {
    if (!session || !env.ownerEmail) return false
    return session.email && session.email.toLowerCase() === env.ownerEmail
  }, [session])

  // ---- cart helpers ----
  const addToCart = useCallback((item) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.id === item.id)
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n }
      return [...c, { id: item.id, name: item.name, price: item.price ?? null, qty: 1 }]
    })
  }, [])
  const setQty = useCallback((id, qty) => {
    setCart((c) => c.map((x) => (x.id === id ? { ...x, qty } : x)).filter((x) => x.qty > 0))
  }, [])
  const removeFromCart = useCallback((id) => setCart((c) => c.filter((x) => x.id !== id)), [])
  const clearCart = useCallback(() => setCart([]), [])

  const subtotal = useMemo(
    () => cart.reduce((sum, x) => sum + (Number(x.price) || 0) * x.qty, 0),
    [cart]
  )
  const cartCount = useMemo(() => cart.reduce((n, x) => n + x.qty, 0), [cart])
  const hasUnpricedItem = useMemo(() => cart.some((x) => x.price == null), [cart])

  const signOut = useCallback(async () => { await authSignOut(); setSession(null); clearCart() }, [clearCart])

  const value = {
    session, setSession, loading, isOwner,
    points, refreshPoints,
    cart, addToCart, setQty, removeFromCart, clearCart,
    subtotal, cartCount, hasUnpricedItem,
    signOut,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
