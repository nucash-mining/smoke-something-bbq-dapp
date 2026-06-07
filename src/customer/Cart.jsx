import { useSession } from '../context/SessionContext.jsx'
import { fmtPrice } from '../config.js'

export default function Cart() {
  const { cart, setQty, removeFromCart, subtotal, hasUnpricedItem } = useSession()

  if (cart.length === 0) {
    return (
      <section className="section">
        <h2>Your order</h2>
        <div className="card"><p className="m-sub" style={{ margin: 0 }}>Your cart is empty — add something tasty above.</p></div>
      </section>
    )
  }

  return (
    <section className="section">
      <h2>Your order</h2>
      <div className="card">
        {cart.map((x) => (
          <div className="cart-row" key={x.id}>
            <div className="cr-name">{x.name}</div>
            <div className="stepper">
              <button onClick={() => setQty(x.id, x.qty - 1)} aria-label="Decrease">–</button>
              <span>{x.qty}</span>
              <button onClick={() => setQty(x.id, x.qty + 1)} aria-label="Increase">+</button>
            </div>
            <div className="cr-price">{x.price == null ? 'Ask' : fmtPrice(x.price * x.qty)}</div>
            <button className="cr-x" onClick={() => removeFromCart(x.id)} aria-label="Remove">×</button>
          </div>
        ))}
        <div className="cart-total">
          <span>Subtotal</span>
          <span>{fmtPrice(subtotal)}</span>
        </div>
        {hasUnpricedItem ? (
          <p className="m-sub" style={{ marginTop: 8 }}>
            Some items are priced "Ask" — staff will confirm the final total in person.
          </p>
        ) : null}
      </div>
    </section>
  )
}
