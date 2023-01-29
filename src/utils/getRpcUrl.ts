// @ts-nocheck

// Array of available nodes to connect to
export const nodes = {
  '80001': 'https://polygon-mumbai.g.alchemy.com/v2/npgkrja2S9UatBgIdLd2Kz6EtHrbvFFs',
  '137': 'https://polygon-rpc.com',
  '1': 'https://mainnet.infura.io/v3/63273290f2b64f1d956e2a607d17b196',
  '43114': 'https://api.avax.network/ext/bc/C/rpc',
  '42161': 'https://arb1.arbitrum.io/rpc',
  '10': 'https://mainnet.optimism.io/',
  '1313161554': 'https://mainnet.aurora.dev',
  '3141': 'https://api.hyperspace.node.glif.io/rpc/v0'
}

const getNodeUrl = () => {
  let chainId = '3141'
  if (window && window.ethereum) {
    chainId = window.ethereum.networkVersion
  }
  if (nodes[chainId] === null || nodes[chainId] === undefined) {
    chainId = process.env.REACT_APP_CHAIN_ID
  }
  return nodes[chainId]
}

export default getNodeUrl
