# Smoke Something BBQ dApp

An ordering + loyalty + payments + location app for **Smoke Something BBQ, LLC**.
One codebase, two experiences:

- **Customer** (`/`) — see the truck's live location and tap to open it in their
  maps app, browse the menu, build an order, check out, and earn loyalty points.
- **Owner** (`/admin`) — sign in to a dashboard: live orders, a camera QR
  scanner to confirm cash payments, a menu/price editor, and a location switch
  that broadcasts the truck's spot to customers.

Facebook: https://www.facebook.com/SmokeSomethingBbq/

---

## Runs out of the box (demo mode)

```bash
npm install
npm run dev      # http://localhost:5173
```

With no Supabase keys set, the app runs in **demo mode** — all data (menu,
orders, accounts, points) lives in your browser so you can click through the
whole thing. A yellow banner reminds you it isn't live yet.

- Customer app: http://localhost:5173/
- Owner dashboard: http://localhost:5173/admin — demo passcode **`bbq-owner`**

---

## Going live with Supabase (real accounts + cross-device data)

The cash-QR flow needs the customer's phone and the owner's scanner to share one
database. That's Supabase.

1. Create a free project at https://supabase.com.
2. **SQL Editor → New query →** paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it.
   This creates the tables, security policies, and seeds the menu.
3. At the bottom of that file, set your owner email:
   `insert into admins (email) values ('you@example.com');`
4. **Project Settings → API**: copy the Project URL and the `anon` public key.
5. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_OWNER_EMAIL=you@example.com
   ```
6. **Auth → Providers → Email**: turn **off** "Confirm email" if you want EVM
   **wallet** sign-in to work (wallet accounts use a synthetic email under the hood).
7. Restart `npm run dev`. The demo banner disappears — you're live.

---

## How it works

| Area | Behavior |
|------|----------|
| **Sign-in** | Email/password, **guest** (one-off order), or **EVM wallet** (connect + sign). Google/Facebook/X can be added later — each needs a developer app registered with that provider. |
| **Menu** | Owner edits items, prices, and availability in the dashboard. Price left blank shows **"Ask"** (for items priced in person). |
| **Orders** | Every order is created **pending**. The **owner confirms payment**, which is the moment loyalty points are awarded — keeps the trusted action with the owner. |
| **Cash QR** | Customer picks "Cash", gets a QR encoding a claim token. Owner scans it in the dashboard → confirms cash received → order logged + points added. |
| **Points** | `loyalty.pointsPerDollar` in `src/config.js` (default 1 pt/$1). Tracked per signed-in customer. |
| **Location** | Owner flips "Share my live location" → device GPS is pushed to the database. Customers see it on a map with an **Open in Maps** button. Off → customers are pointed to Facebook. |

## Payment methods (`src/config.js`)

| Slot | What to set |
|------|-------------|
| Crypto (Web3) | `crypto.receiveAddress` (one `0x…` works on every EVM chain) |
| Chains | `crypto.chains.*` — Altcoinchain, WATTx, Ethereum, Polygon, BNB |
| Hosted gateway | `gateway.checkoutUrl` (cryptopaymentgateway.com or similar) |
| Cash App | `fiat.cashapp.cashtag` |
| PayPal | `fiat.paypal.handle` (your PayPal.Me name) |
| Venmo | `fiat.venmo.handle` |

### Crypto networks (from the owner's own chain configs)

| Network | Chain ID | Symbol | RPC | Explorer |
|---------|---------:|--------|-----|----------|
| Altcoinchain | 2330 | ALT | https://rpc.altcoinchain.org | https://expedition.altcoinchain.org |
| WATTx | 81 | WATTx | https://rpc.wattxchange.app | https://wattxscan.io |
| Ethereum | 1 | ETH | llamarpc | etherscan.io |
| Polygon | 137 | POL | polygon-rpc.com | polygonscan.com |
| BNB Smart Chain | 56 | BNB | bsc-dataseed | bscscan.com |

---

## Build / deploy

```bash
npm run build    # -> dist/
npm run preview  # serve the built app locally
```

> Camera (QR scan), geolocation, and wallet APIs require a **secure context**.
> `localhost` is fine for dev; in production you **must** serve over **HTTPS**.

## Mobile apps (Android + iOS via Capacitor)

The web app is wrapped with [Capacitor](https://capacitorjs.com) so it ships as
native Android and iOS apps from the same code.

```bash
npm run build          # build the web assets into dist/
npx cap sync           # copy them into the native projects
```

**Android APK (build locally)**
```bash
cd android
./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk  (install on any phone)
```

**iOS** — Apple only allows iOS builds on **macOS + Xcode**, so it can't be
compiled on Linux. Two options:
- **Cloud CI (set up here):** the GitHub Actions workflow in
  `.github/workflows/build.yml` builds the iOS app on a macOS runner on every
  push. A real device `.ipa` / App Store upload needs an Apple Developer account
  ($99/yr) and signing certs added as repo secrets.
- **On a Mac:** `npx cap open ios`, then Run in Xcode.

**Releases:** push a tag and CI attaches the APK to a GitHub Release:
```bash
git tag v1.0.0 && git push origin v1.0.0
```

## Stack

React 18 · Vite · React Router · Supabase (Postgres + Auth) · ethers v6 ·
Leaflet (OpenStreetMap, no API key) · qrcode + html5-qrcode · Capacitor (Android/iOS).

## Project layout

```
src/
  config.js            # business, menu seed, payments, loyalty, env  (owner edits)
  lib/                 # supabaseClient, auth, db (data layer), web3, chains, payLinks
  context/             # SessionContext (auth session + cart + points)
  auth/AuthPanel.jsx   # email / guest / wallet sign-in
  customer/            # CustomerApp, Menu, Cart, Checkout, CashQR, LocationCard
  owner/               # OwnerApp, OrdersBoard, QRScanner, MenuEditor, LocationBroadcast
supabase/schema.sql    # run this in Supabase to go live
```
