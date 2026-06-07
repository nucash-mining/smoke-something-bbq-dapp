// EVM chain definitions used for wallet add/switch + native-coin payments.
// Pulled from the owner's own WATTx/Altcoinchain configs plus the public
// mainnet params for ETH / Polygon / BNB.
//
// `decimals` here is the native value precision used to build a transaction.
// On EVM the wei base is 18 for all of these; we keep it explicit per chain so
// it's easy to override if a chain ever differs.

export const CHAINS = {
  altcoinchain: {
    key: 'altcoinchain',
    chainId: 2330,
    chainIdHex: '0x91a',
    name: 'Altcoinchain',
    symbol: 'ALT',
    decimals: 18,
    rpcUrls: ['https://rpc.altcoinchain.org'],
    blockExplorerUrls: ['https://expedition.altcoinchain.org'],
    color: '#dc2626',
  },
  wattxchain: {
    key: 'wattxchain',
    chainId: 81,
    chainIdHex: '0x51',
    name: 'WATTx Mainnet',
    symbol: 'WATTx',
    decimals: 18,
    rpcUrls: ['https://rpc.wattxchange.app'],
    blockExplorerUrls: ['https://wattxscan.io'],
    color: '#f0b90b',
  },
  ethereum: {
    key: 'ethereum',
    chainId: 1,
    chainIdHex: '0x1',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://eth.llamarpc.com', 'https://cloudflare-eth.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    color: '#627eea',
  },
  polygon: {
    key: 'polygon',
    chainId: 137,
    chainIdHex: '0x89',
    name: 'Polygon',
    symbol: 'POL',
    decimals: 18,
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    color: '#8247e5',
  },
  bnb: {
    key: 'bnb',
    chainId: 56,
    chainIdHex: '0x38',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    decimals: 18,
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
    color: '#f3ba2f',
  },
}

export const chainList = Object.values(CHAINS)
