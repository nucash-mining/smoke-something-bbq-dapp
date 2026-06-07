// Deep links for cash apps. Amount is optional; apps accept it in the URL.
export function cashAppLink(cashtag, amount) {
  const a = amount && Number(amount) > 0 ? `/${Number(amount)}` : ''
  return `https://cash.app/$${cashtag}${a}`
}
export function payPalLink(handle, amount) {
  const a = amount && Number(amount) > 0 ? `/${Number(amount)}` : ''
  return `https://www.paypal.com/paypalme/${handle}${a}`
}
export function venmoLink(handle, amount) {
  const a = amount && Number(amount) > 0 ? `?txn=pay&amount=${Number(amount)}` : ''
  return `https://venmo.com/u/${handle}${a}`
}

// Build a maps link from coordinates that opens the device's default maps app.
export function mapsLink(lat, lng, label = '') {
  const q = `${lat},${lng}`
  // geo: works on Android; the https google maps URL works everywhere as fallback.
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}${
    label ? `&query_place_id=${encodeURIComponent(label)}` : ''
  }`
}
