import { gateway, isPlaceholder } from '../config.js'

// Hosted crypto checkout (cryptopaymentgateway.com or any redirect-style
// gateway). Sends the customer to the gateway's checkout with the amount filled.
export default function GatewayPay({ amount }) {
  if (!gateway.enabled) return null

  const missing = isPlaceholder(gateway.checkoutUrl)
  const validAmount = amount && Number(amount) > 0

  const url =
    !missing && validAmount
      ? gateway.checkoutUrl.replace('{AMOUNT}', encodeURIComponent(amount))
      : undefined

  return (
    <section className="section">
      <h2>Hosted crypto checkout</h2>
      <div className="card">
        <a
          className="btn"
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => (!url) && e.preventDefault()}
          style={!url ? { opacity: 0.5, pointerEvents: 'none', display: 'block', textAlign: 'center' } : { display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          Checkout via {gateway.provider}
        </a>
        {missing ? (
          <div className="status err">
            Set <code>gateway.checkoutUrl</code> in <code>src/config.js</code> to enable.
          </div>
        ) : !validAmount ? (
          <div className="status">Enter an amount above to continue.</div>
        ) : null}
      </div>
    </section>
  )
}
