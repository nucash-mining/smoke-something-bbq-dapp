// =============================================================================
// SMOKE SOMETHING BBQ, LLC — MERCHANT CONFIG
// =============================================================================
// This is the ONLY file the business owner needs to edit.
// Turn payment "slots" on/off with `enabled`, and drop in your handles/wallet.
// Anything left as a placeholder ("0xYOUR...", "YOUR_...") will show a warning
// in the UI until you fill it in.
// =============================================================================

export const business = {
  name: 'Smoke Something BBQ, LLC',
  tagline: '', // optional — leave '' to hide
  facebook: 'https://www.facebook.com/SmokeSomethingBbq/',
  // Optional: a phone number for SMS/orders (leave '' to hide)
  phone: '',
  // Logo path inside /public (drop a file there and set its name)
  logo: '',
}

// -----------------------------------------------------------------------------
// LOYALTY POINTS
// -----------------------------------------------------------------------------
export const loyalty = {
  enabled: true,
  pointsPerDollar: 1,      // points earned per $1 spent on a paid order
  // (Redemption is up to you later — points just accumulate for now.)
}

// -----------------------------------------------------------------------------
// MENU (seed/fallback). When Supabase is connected the owner edits the live
// menu in the dashboard; this list is used in offline-demo mode and as the
// initial seed. price: null means "Ask / TBD".
// -----------------------------------------------------------------------------
export const defaultMenu = [
  { id: 'brisket', category: 'Plates', name: 'Smoked Brisket Plate', description: 'Slow-smoked brisket with two sides', price: 18, available: true, sort_order: 1 },
  { id: 'chicken', category: 'Plates', name: 'Chicken Plate', description: 'Smoked chicken with two sides', price: null, available: true, sort_order: 2 },
  { id: 'ribs', category: 'Ribs', name: 'Ribs', description: 'Smoked pork ribs', price: null, available: true, sort_order: 1 },
  { id: 'potato-salad', category: 'Sides', name: 'Potato Salad', description: 'House-made potato salad', price: null, available: true, sort_order: 1 },
  { id: 'corn', category: 'Sides', name: 'Corn', description: 'Sweet corn', price: null, available: true, sort_order: 2 },
]

// Order in which categories render.
export const categoryOrder = ['Plates', 'Ribs', 'Sides']

// -----------------------------------------------------------------------------
// CRYPTO / WEB3  (EVM native-coin payments straight to the owner's wallet)
// -----------------------------------------------------------------------------
// `receiveAddress` is where customer crypto lands. Use ONE address you control
// on every EVM chain below (the same 0x... works across all of them).
export const crypto = {
  enabled: true,
  receiveAddress: '0xYOUR_RECEIVE_WALLET_ADDRESS', // <-- REQUIRED to accept crypto
  // Which chains to offer. Toggle `enabled` per chain.
  chains: {
    altcoinchain: { enabled: true },
    wattxchain: { enabled: true },
    ethereum: { enabled: true },
    polygon: { enabled: true },
    bnb: { enabled: true },
  },
}

// -----------------------------------------------------------------------------
// HOSTED CRYPTO CHECKOUT  (cryptopaymentgateway.com or similar redirect)
// -----------------------------------------------------------------------------
// If you'd rather use a hosted gateway than direct wallet sends, enable this and
// paste the checkout/pay link the gateway gives you. {AMOUNT} is replaced with
// the amount the customer enters.
export const gateway = {
  enabled: false,
  provider: 'cryptopaymentgateway.com',
  // Example: 'https://cryptopaymentgateway.com/pay/YOUR_MERCHANT_ID?amount={AMOUNT}'
  checkoutUrl: 'YOUR_GATEWAY_CHECKOUT_URL',
}

// -----------------------------------------------------------------------------
// FIAT / CASH APPS  (deep links — opens the customer's app)
// -----------------------------------------------------------------------------
export const fiat = {
  cashapp: {
    enabled: true,
    cashtag: 'YOUR_CASHTAG', // without the $, e.g. SmokeSomethingBBQ
  },
  paypal: {
    enabled: true,
    handle: 'YOUR_PAYPAL_ME', // your PayPal.Me name, e.g. SmokeSomethingBBQ
  },
  venmo: {
    enabled: true,
    handle: 'YOUR_VENMO_USERNAME', // without the @, e.g. SmokeSomethingBBQ
  },
}

// -----------------------------------------------------------------------------
// LOCATION  ("Show our live location" slider)
// -----------------------------------------------------------------------------
export const location = {
  enabled: true,
  // Default map center if the customer hasn't shared location yet (optional).
  // Set to your usual pitch/storefront so the map isn't blank. [lat, lng]
  defaultCenter: [35.2271, -80.8431], // Charlotte, NC — change to your area
  defaultZoom: 12,
}

// -----------------------------------------------------------------------------
// ENVIRONMENT (read from .env — see .env.example)
// -----------------------------------------------------------------------------
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  ownerEmail: (import.meta.env.VITE_OWNER_EMAIL || '').toLowerCase(),
  demoOwnerPasscode: import.meta.env.VITE_DEMO_OWNER_PASSCODE || 'bbq-owner',
}

// True when Supabase creds are present; otherwise the app runs offline-demo.
export const isSupabaseConfigured = !!(env.supabaseUrl && env.supabaseAnonKey)

// Helper used across the UI to flag un-filled placeholders.
export const isPlaceholder = (v) =>
  !v || typeof v !== 'string' || v.startsWith('0xYOUR') || v.startsWith('YOUR_')

// Money formatter shared across the app. null/undefined => "Ask".
export const fmtPrice = (p) =>
  p === null || p === undefined || p === '' ? 'Ask' : `$${Number(p).toFixed(2)}`
