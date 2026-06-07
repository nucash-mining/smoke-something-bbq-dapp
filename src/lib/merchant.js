// Resolves the merchant's active payment accounts: values the owner saved in the
// dashboard (stored in settings) take precedence over the defaults in config.js.
// A method is only offered to customers once it has a real handle/address.

import { fiat, crypto as cryptoCfg, gateway, isPlaceholder } from '../config.js'

const clean = (v) => (typeof v === 'string' ? v.trim() : '')
const fromCfg = (v) => (isPlaceholder(v) ? '' : v)

export function resolvePayments(s = {}) {
  const cashtag = clean(s.cashapp_tag) || fromCfg(fiat.cashapp?.cashtag)
  const paypal = clean(s.paypal_handle) || fromCfg(fiat.paypal?.handle)
  const venmo = clean(s.venmo_handle) || fromCfg(fiat.venmo?.handle)
  const cryptoAddr = clean(s.crypto_address) || fromCfg(cryptoCfg.receiveAddress)
  const gatewayUrl = clean(s.gateway_url) || fromCfg(gateway.checkoutUrl)

  return {
    cash: { enabled: true },
    cashapp: { enabled: !!cashtag, handle: cashtag },
    paypal: { enabled: !!paypal, handle: paypal },
    venmo: { enabled: !!venmo, handle: venmo },
    crypto: { enabled: cryptoCfg.enabled && !!cryptoAddr, address: cryptoAddr },
    gateway: { enabled: !!gatewayUrl, url: gatewayUrl, provider: gateway.provider },
  }
}
