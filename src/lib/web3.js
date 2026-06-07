import { BrowserProvider, parseUnits } from 'ethers'

// Thin helpers around an injected EVM wallet (MetaMask / Coinbase / etc.).

export function hasWallet() {
  return typeof window !== 'undefined' && !!window.ethereum
}

export async function connectWallet() {
  if (!hasWallet()) {
    throw new Error('No EVM wallet found. Install MetaMask or a compatible wallet.')
  }
  const provider = new BrowserProvider(window.ethereum)
  const accounts = await provider.send('eth_requestAccounts', [])
  return { provider, address: accounts[0] }
}

// Ensure the wallet is on `chain`, adding it first if the wallet doesn't know it.
export async function ensureChain(chain) {
  if (!hasWallet()) throw new Error('No EVM wallet found.')
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainIdHex }],
    })
  } catch (err) {
    // 4902 = chain not added to the wallet yet.
    if (err && (err.code === 4902 || err.code === -32603)) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chain.chainIdHex,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.symbol,
              symbol: chain.symbol,
              decimals: chain.decimals,
            },
            rpcUrls: chain.rpcUrls,
            blockExplorerUrls: chain.blockExplorerUrls,
          },
        ],
      })
    } else {
      throw err
    }
  }
}

// Send native coin (ALT / WATTx / ETH / POL / BNB) to the merchant.
// Returns the explorer URL for the broadcast tx.
export async function payNative({ chain, to, amount }) {
  const { provider } = await connectWallet()
  await ensureChain(chain)

  // Re-create provider after a chain switch so the signer points at the new net.
  const freshProvider = new BrowserProvider(window.ethereum)
  const signer = await freshProvider.getSigner()

  const value = parseUnits(String(amount), chain.decimals)
  const tx = await signer.sendTransaction({ to, value })

  const base = chain.blockExplorerUrls?.[0]?.replace(/\/$/, '')
  return {
    hash: tx.hash,
    explorerUrl: base ? `${base}/tx/${tx.hash}` : null,
    wait: () => tx.wait(),
  }
}
