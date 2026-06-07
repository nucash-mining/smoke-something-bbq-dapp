import { useMemo, useState } from 'react'
import { crypto, isPlaceholder } from '../config.js'
import { CHAINS } from '../lib/chains.js'
import { payNative, hasWallet } from '../lib/web3.js'

export default function CryptoPay({ amount, receiveAddress }) {
  // Owner's saved address (from dashboard) overrides the config default.
  const toAddress = receiveAddress || crypto.receiveAddress
  // Only show chains the owner enabled in config.
  const enabledChains = useMemo(
    () =>
      Object.entries(crypto.chains)
        .filter(([key, c]) => c.enabled && CHAINS[key])
        .map(([key]) => CHAINS[key]),
    []
  )

  const [selected, setSelected] = useState(enabledChains[0]?.key)
  const [status, setStatus] = useState(null) // {type, node}
  const [busy, setBusy] = useState(false)

  if (!crypto.enabled || enabledChains.length === 0) return null

  const chain = CHAINS[selected]
  const addrMissing = isPlaceholder(toAddress)
  const validAmount = amount && Number(amount) > 0

  async function handlePay() {
    setStatus(null)
    if (!hasWallet()) {
      setStatus({
        type: 'err',
        node: (
          <>No EVM wallet detected. Install{' '}
            <a href="https://metamask.io" target="_blank" rel="noreferrer">MetaMask</a> and reload.</>
        ),
      })
      return
    }
    try {
      setBusy(true)
      setStatus({ type: 'ok', node: <>Confirm the transaction in your wallet…</> })
      const res = await payNative({
        chain,
        to: toAddress,
        amount,
      })
      setStatus({
        type: 'ok',
        node: (
          <>
            Sent! Tx:{' '}
            {res.explorerUrl ? (
              <a href={res.explorerUrl} target="_blank" rel="noreferrer">
                {res.hash.slice(0, 10)}…
              </a>
            ) : (
              res.hash
            )}
          </>
        ),
      })
    } catch (err) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed.'
      setStatus({ type: 'err', node: <>{msg}</> })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section">
      <h2>Also pay with crypto (optional)</h2>
      <div className="card">
        <div className="chains" role="group" aria-label="Choose a network">
          {enabledChains.map((c) => (
            <button
              key={c.key}
              className="chip"
              aria-pressed={selected === c.key}
              onClick={() => setSelected(c.key)}
            >
              <span className="dot" style={{ background: c.color }} />
              {c.symbol}
            </button>
          ))}
        </div>

        <button
          className="btn"
          onClick={handlePay}
          disabled={busy || addrMissing || !validAmount}
        >
          {busy
            ? 'Waiting on wallet…'
            : `Pay ${validAmount ? amount : '—'} ${chain.symbol} on ${chain.name}`}
        </button>

        {addrMissing ? (
          <div className="status err">
            Crypto is on, but no receive wallet is set. Add{' '}
            <code>crypto.receiveAddress</code> in <code>src/config.js</code>.
          </div>
        ) : !validAmount ? (
          <div className="status">Enter an amount above to pay.</div>
        ) : null}

        {status ? <div className={`status ${status.type}`}>{status.node}</div> : null}
      </div>
    </section>
  )
}
