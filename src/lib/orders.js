// Shared order-status model.
//
// Two INDEPENDENT dimensions:
//   • payment    -> `paid` (boolean): has the owner received the money yet?
//   • fulfillment-> `status`: where the food is in its lifecycle.
//
// Cash-on-pickup orders move through fulfillment (Preparing -> Ready) while
// still showing NOT PAID, until the customer hands over cash and the owner
// marks it paid.

export const FULFILL_STEPS = ['new', 'preparing', 'ready', 'completed']

export const FULFILL_LABEL = {
  new: 'Received',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  completed: 'Picked up',
  cancelled: 'Cancelled',
}

export const FULFILL_COLOR = {
  new: '#8a7d6b',
  preparing: '#e0a92e',
  ready: '#4caf7d',
  completed: '#627eea',
  cancelled: '#b3493a',
}

// The next fulfillment action the owner can take (null if terminal).
export function nextFulfill(status) {
  const i = FULFILL_STEPS.indexOf(status)
  if (i === -1 || i >= FULFILL_STEPS.length - 1) return null
  return FULFILL_STEPS[i + 1]
}

// Button label for advancing to a given status.
export const ADVANCE_LABEL = {
  preparing: 'Start preparing',
  ready: 'Mark ready',
  completed: 'Mark picked up',
}

export const paymentLabel = (o) => (o.paid ? 'Paid' : 'Not paid')

// Date + time down to the second, e.g. "Jun 7, 2026, 1:07:42 PM".
export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  })
}
