// Data layer. Supabase when configured, else localStorage (offline demo).
//
// Trust model: every order is created `pending`. The OWNER confirms payment
// (cash via QR scan, or "Mark paid" for app payments) — that single action
// flips status to `paid` and awards loyalty points. This keeps the trusted
// write on the admin and matches the row-level-security policies in schema.sql.

import { supabase } from './supabaseClient.js'
import { isSupabaseConfigured, defaultMenu, loyalty } from '../config.js'

const LS_MENU = 'ssbbq_menu'
const LS_ORDERS = 'ssbbq_orders'
const LS_SETTINGS = 'ssbbq_settings'
const LS_USERS = 'ssbbq_demo_users'
const LS_REVIEWS = 'ssbbq_reviews'

const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 't_' + Date.now() + Math.random())
const token = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

const pointsFor = (subtotal) =>
  loyalty.enabled ? Math.round(Number(subtotal || 0) * loyalty.pointsPerDollar) : 0

// ============================ MENU ============================

export async function getMenu() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('sort_order')
    if (error) throw error
    return data
  }
  let menu = read(LS_MENU, null)
  if (!menu) { menu = defaultMenu.map((m) => ({ ...m })); write(LS_MENU, menu) }
  return menu
}

export async function saveMenuItem(item) {
  if (isSupabaseConfigured) {
    const row = { ...item }
    if (!row.id) delete row.id
    const { data, error } = await supabase.from('menu_items').upsert(row).select().single()
    if (error) throw error
    return data
  }
  const menu = read(LS_MENU, defaultMenu.map((m) => ({ ...m })))
  if (item.id) {
    const i = menu.findIndex((m) => m.id === item.id)
    if (i >= 0) menu[i] = { ...menu[i], ...item }
    else menu.push(item)
  } else {
    menu.push({ ...item, id: uuid() })
  }
  write(LS_MENU, menu)
  return item
}

export async function deleteMenuItem(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error
    return
  }
  write(LS_MENU, read(LS_MENU, []).filter((m) => m.id !== id))
}

// ============================ ORDERS ============================

// session: current customer session (or null for pure anon)
export async function createOrder({ session, items, subtotal, paymentMethod, guestName }) {
  const claim_token = token()
  const base = {
    items,
    subtotal,
    payment_method: paymentMethod,
    status: 'new',   // fulfillment lifecycle: new -> preparing -> ready -> completed
    paid: false,     // payment is separate from fulfillment
    claim_token,
    guest_name: session?.kind === 'guest' ? (guestName || session.displayName) : null,
  }

  if (isSupabaseConfigured) {
    const user_id = session && session.kind !== 'guest' ? session.id : null
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...base, user_id })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const orders = read(LS_ORDERS, [])
  const order = {
    ...base,
    id: uuid(),
    user_id: session && session.kind !== 'guest' ? session.id : null,
    points_awarded: 0,
    created_at: new Date().toISOString(),
  }
  orders.unshift(order)
  write(LS_ORDERS, orders)
  return order
}

export async function listOrders({ status } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  let orders = read(LS_ORDERS, [])
  if (status) orders = orders.filter((o) => o.status === status)
  return orders
}

export async function getMyOrders(session) {
  if (!session || session.kind === 'guest') return []
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return read(LS_ORDERS, []).filter((o) => o.user_id === session.id)
}

export async function getOrderByToken(claimToken) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('claim_token', claimToken)
      .maybeSingle()
    if (error) throw error
    return data
  }
  return read(LS_ORDERS, []).find((o) => o.claim_token === claimToken) || null
}

// Owner action: confirm payment (cash received / app payment) + award points.
// This does NOT change fulfillment status — see setOrderStatus for that.
export async function markOrderPaid(orderId, paymentMethod) {
  if (isSupabaseConfigured) {
    const { data: order, error: e1 } = await supabase
      .from('orders').select('*').eq('id', orderId).single()
    if (e1) throw e1
    if (order.paid) return order
    const pts = pointsFor(order.subtotal)
    const { data, error } = await supabase
      .from('orders')
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod || order.payment_method,
        points_awarded: pts,
      })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw error
    if (order.user_id && pts > 0) {
      // increment profile points (owner is admin -> allowed by RLS)
      const { data: prof } = await supabase
        .from('profiles').select('points').eq('id', order.user_id).single()
      await supabase
        .from('profiles')
        .update({ points: (prof?.points || 0) + pts })
        .eq('id', order.user_id)
    }
    return data
  }

  const orders = read(LS_ORDERS, [])
  const o = orders.find((x) => x.id === orderId)
  if (!o || o.paid) return o
  const pts = pointsFor(o.subtotal)
  o.paid = true
  o.paid_at = new Date().toISOString()
  o.payment_method = paymentMethod || o.payment_method
  o.points_awarded = pts
  write(LS_ORDERS, orders)
  if (o.user_id && pts > 0) {
    const users = read(LS_USERS, {})
    const key = Object.keys(users).find((k) => users[k].id === o.user_id)
    if (key) { users[key].points = (users[key].points || 0) + pts; write(LS_USERS, users) }
  }
  return o
}

// Owner action: advance the fulfillment status (new->preparing->ready->completed
// or 'cancelled'). Independent of payment.
export async function setOrderStatus(orderId, status) {
  const patch = { status }
  if (status === 'completed') patch.picked_up_at = new Date().toISOString()
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders').update(patch).eq('id', orderId).select().single()
    if (error) throw error
    return data
  }
  const orders = read(LS_ORDERS, [])
  const o = orders.find((x) => x.id === orderId)
  if (!o) return null
  Object.assign(o, patch)
  write(LS_ORDERS, orders)
  return o
}

// Customer-facing: look up a single order by its claim token (for guests who
// don't have an account but kept their order reference on this device).
export async function trackOrder(claimToken) {
  if (isSupabaseConfigured) {
    // public RPC (security definer) returns limited fields — see schema.sql
    const { data, error } = await supabase.rpc('track_order', { p_token: claimToken })
    if (error) throw error
    return Array.isArray(data) ? data[0] || null : data
  }
  return read(LS_ORDERS, []).find((o) => o.claim_token === claimToken) || null
}

// ============================ PROFILE / POINTS ============================

export async function getPoints(session) {
  if (!session || session.kind === 'guest') return 0
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('points').eq('id', session.id).maybeSingle()
    return data?.points || 0
  }
  const users = read(LS_USERS, {})
  const key = Object.keys(users).find((k) => users[k].id === session.id)
  return users[key]?.points || 0
}

// ============================ SETTINGS / LOCATION ============================

export async function getSettings() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('business_settings').select('*').eq('id', 1).maybeSingle()
    if (error) throw error
    return data || { id: 1, location_enabled: false }
  }
  return read(LS_SETTINGS, { id: 1, location_enabled: false, location_lat: null, location_lng: null })
}

export async function saveSettings(patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('business_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const cur = read(LS_SETTINGS, { id: 1 })
  const next = { ...cur, ...patch, updated_at: new Date().toISOString() }
  write(LS_SETTINGS, next)
  return next
}

// ============================ IMAGE UPLOAD ============================

// Returns a URL string for the uploaded image.
// Supabase -> public Storage URL. Demo -> inline base64 data URL.
export async function uploadMenuImage(file) {
  if (!file) return null
  if (isSupabaseConfigured) {
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
    const path = `${uuid()}.${ext}`
    const { error } = await supabase.storage
      .from('menu-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    return data.publicUrl
  }
  // demo: read into a data URL (kept in localStorage with the menu item)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============================ REVIEWS ============================

export async function getReviews(menuItemId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
  return read(LS_REVIEWS, []).filter((r) => r.menu_item_id === menuItemId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export async function addReview({ menuItemId, session, rating, comment }) {
  const author_name =
    session?.displayName || (session?.kind === 'guest' ? 'Guest' : 'Anonymous')
  const base = {
    menu_item_id: menuItemId,
    rating: Math.max(1, Math.min(5, Number(rating) || 0)),
    comment: (comment || '').trim(),
    author_name,
  }
  if (isSupabaseConfigured) {
    const user_id = session && session.kind !== 'guest' ? session.id : null
    const { data, error } = await supabase
      .from('reviews').insert({ ...base, user_id }).select().single()
    if (error) throw error
    return data
  }
  const reviews = read(LS_REVIEWS, [])
  const row = {
    ...base,
    id: uuid(),
    user_id: session && session.kind !== 'guest' ? session.id : null,
    created_at: new Date().toISOString(),
  }
  reviews.unshift(row)
  write(LS_REVIEWS, reviews)
  return row
}

// Average + count for a set of reviews (computed client-side).
export function summarizeReviews(reviews) {
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0 }
  const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0)
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length }
}
