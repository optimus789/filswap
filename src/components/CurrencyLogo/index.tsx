// @ts-nocheck
import { Currency, ETHER, Token } from '@uniswap/sdk'
import { useActiveWeb3React } from 'hooks'
import React, { useMemo } from 'react'
import styled from 'styled-components'

import EthereumLogo from '../../assets/images/ethereum-logo.png'
import FILLogo from '../../assets/images/filecoin-fil-logo.png'
import useHttpLocations from '../../hooks/useHttpLocations'
import { WrappedTokenInfo } from '../../state/lists/hooks'
import Logo from '../Logo'
import tokenList from '../../constants/list.json'
// sam changes
// TODO: this task is left to add chain in gettokenlogourl
export const getTokenLogoURL = (address: string) => {
  const tokens: any = {
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': {
      chainId: 137,
      address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
      name: 'DAI',
      symbol: 'DAI',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg?v=006'
    },
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
      chainId: 137,
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      name: 'USDC',
      symbol: 'USDC',
      decimals: 6,
      logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=006'
    },
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': {
      chainId: 137,
      address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
      name: 'WETH',
      symbol: 'WETH',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
    },
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': {
      chainId: 137,
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      name: 'wMatic',
      symbol: 'wMatic',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/matic-network-matic-logo.svg?v=006'
    },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': {
      chainId: 137,
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      name: 'USDT',
      symbol: 'USDT',
      decimals: 6,
      logoURI: 'https://seeklogo.com/images/T/tether-usdt-logo-FA55C7F397-seeklogo.com.png'
    },
    '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': {
      chainId: 137,
      address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
      name: 'WBTC',
      symbol: 'WBTC',
      decimals: 8,
      logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744'
    }
  }

  let findToken
  for (let i = 0; i < tokenList?.tokens?.length; i++) {
    if (tokenList.tokens?.[i]?.address?.toLowerCase() === address || tokenList.tokens?.[i]?.address === address) {
      findToken = tokenList.tokens?.[i]
    }
  }

  // console.log("find",findToken)

  return tokens[address.toLowerCase()] ? tokens[address.toLowerCase()].logoURI : findToken?.logoURI
  // return tokens[address.toLowerCase()] ? tokens[address.toLowerCase()].logoURI : ``
}

const StyledEthereumLogo = styled.img<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  border-radius: 24px;
`

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
`

export default function CurrencyLogo({
  currency,
  size = '24px',
  style
}: {
  currency?: Currency
  size?: string
  style?: React.CSSProperties
}) {
  const { chainId } = useActiveWeb3React()
  const uriLocations = useHttpLocations(currency instanceof WrappedTokenInfo ? currency.logoURI : undefined)
  const srcs: string[] = useMemo(() => {
    if (currency === ETHER) return []

    if (currency instanceof Token) {
      if (currency instanceof WrappedTokenInfo) {
        return [...uriLocations]
      }
      console.log({ currency })
      return [getTokenLogoURL(currency.address)]
    }
    return []
  }, [currency, uriLocations])
  if (currency && currency.symbol) {
    //console.log(currency?.symbol?.[0])
    srcs.push(`images/tokens/${currency?.symbol?.[0]}.png`)
    // srcs.push(`images/tokens/Kick.png`)
  }
  if (currency === ETHER && (chainId === 137 || chainId === 80001)) {
    return <StyledEthereumLogo src={MaticLogo} size={size} style={style} />
  }

  if (currency === ETHER && chainId === 3141) {
    return <StyledEthereumLogo src={FILLogo} size={size} style={style} />
  }

  if (currency === ETHER && (chainId === 1 || chainId === 42161 || chainId === 10 || chainId === 1313161554)) {
    return <StyledEthereumLogo src={EthereumLogo} size={size} style={style} />
  }

  if (currency === ETHER && chainId === 43114) {
    return <StyledEthereumLogo src={AvaxLogo} size={size} style={style} />
  }

  return <StyledLogo size={size} srcs={srcs} alt={`${currency?.getSymbol(chainId) ?? 'token'} logo`} style={style} />
}
