/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { ChainId, Currency, TokenAmount, CurrencyAmount, JSBI } from '@uniswap/sdk'
import Web3 from 'web3'

import React, { useState, useEffect, useRef } from 'react'
import { Text } from 'rebass'
import { NavLink, useHistory } from 'react-router-dom'
import { useDispatch } from 'react-redux'

import { darken } from 'polished'
import { useTranslation } from 'react-i18next'

import styled from 'styled-components'

import Logo from '../../assets/svg/logo.svg'
import LogoDark from '../../assets/svg/logo_white.svg'
import { useActiveWeb3React } from '../../hooks'
import { useDarkModeManager } from '../../state/user/hooks'
import { useETHBalances, useAggregateUniBalance } from '../../state/wallet/hooks'
import { CardNoise } from '../earn/styled'
import { CountUp } from 'use-count-up'
import { TYPE, ExternalLink } from '../../theme'
import { withStyles, makeStyles } from '@material-ui/core/styles'
import { replaceURLParam } from '../../utils/routes'

import { YellowCard } from '../Card'
import { Moon, Sun } from 'react-feather'
import Menu from '../Menu'

import Row, { RowFixed } from '../Row'
import Web3Status from '../Web3Status'
import ClaimModal from '../claim/ClaimModal'
import { useToggleSelfClaimModal, useShowClaimPopup, useSetChainId } from '../../state/application/hooks'
import { useUserHasAvailableClaim } from '../../state/claim/hooks'
import { useUserHasSubmittedClaim } from '../../state/transactions/hooks'
import { Dots } from '../swap/styleds'
import Modal from '../Modal'
import UniBalanceContent from './UniBalanceContent'
import usePrevious from '../../hooks/usePrevious'

import useParsedQueryString from '../../hooks/useParsedQueryString'
import rpcUrl from 'utils/getRpcUrl'
import { networks } from '../../constants'

const HeaderFrame = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px;
  align-items: center;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  width: 100%;
  top: 0;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 1rem;
  z-index: 2;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    padding: 0 1rem;
    width: calc(100%);
    position: relative;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 0.5rem 1rem;
  `}
`
const useStyles = makeStyles<StyleProps>(theme => ({
  menu: {
    '& .MuiPaper-root': {
      backgroundColor: ({ isDark }) => (isDark ? '#2C2F36' : '#F7F8FA'),
      minWidth: '200px'
    }
  }
}))
const HeaderControls = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: flex-end;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex-direction: row;
    justify-content: space-between;
    justify-self: center;
    width: 100%;
    max-width: 960px;
    padding: 1rem;
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100%;
    z-index: 99;
    height: 72px;
    border-radius: 12px 12px 0 0;
    background-color: ${({ theme }) => theme.bg1};
  `};
`

const HeaderElement = styled.div`
  display: flex;
  align-items: center;

  /* addresses safari's lack of support for "gap" */
  & > *:not(:first-child) {
    margin-left: 8px;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
   flex-direction: row-reverse;
    align-items: center;
  `};
`

const HeaderElementWrap = styled.div`
  display: flex;
  align-items: center;
`

const HeaderRow = styled(RowFixed)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
   width: 100%;
  `};
`

const HeaderLinks = styled(Row)`
  justify-content: center;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem 0 1rem 1rem;
    justify-content: flex-end;
`};
`

const AccountElement = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, active }) => (!active ? theme.bg1 : theme.bg3)};
  border-radius: 12px;
  white-space: nowrap;
  width: 100%;
  cursor: pointer;

  :focus {
    border: 1px solid blue;
  }
`

const UNIAmount = styled(AccountElement)`
  color: white;
  padding: 4px 8px;
  height: 36px;
  font-weight: 500;
  background-color: ${({ theme }) => theme.bg3};
  background: radial-gradient(174.47% 188.91% at 1.84% 0%, #ff007a 0%, #2172e5 100%), #edeef2;
`

const UNIWrapper = styled.span`
  width: fit-content;
  position: relative;
  cursor: pointer;

  :hover {
    opacity: 0.8;
  }

  :active {
    opacity: 0.9;
  }
`

const HideSmall = styled.span`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `};
`

const NetworkCard = styled(YellowCard)`
  border-radius: 12px;
  padding: 8px 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    margin: 0;
    margin-right: 0.5rem;
    width: initial;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
  `};
`

const BalanceText = styled(Text)`
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

const Title = styled.a`
  display: flex;
  align-items: center;
  pointer-events: auto;
  justify-self: flex-start;
  margin-right: 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    justify-self: center;
  `};
  :hover {
    cursor: pointer;
  }
`

const UniIcon = styled.div`
  transition: transform 0.3s ease;
  :hover {
    transform: rotate(-5deg);
  }
`

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(NavLink).attrs({
  activeClassName
})`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text2};
  font-size: 1rem;
  width: fit-content;
  margin: 0 12px;
  font-weight: 500;

  &.${activeClassName} {
    border-radius: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.text1};
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text1)};
  }
`

const StyledExternalLink = styled(ExternalLink).attrs({
  activeClassName
})<{ isActive?: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text2};
  font-size: 1rem;
  width: fit-content;
  margin: 0 12px;
  font-weight: 500;

  &.${activeClassName} {
    border-radius: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.text1};
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text1)};
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
      display: none;
`}
`

export const StyledMenuButton = styled.button`
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};
  margin-left: 8px;
  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }

  svg {
    margin-top: 2px;
  }
  > * {
    stroke: ${({ theme }) => theme.text1};
  }
`

const NETWORK_LABELS: { [chainId in ChainId]?: string } = {
  [ChainId.RINKEBY]: 'Rinkeby',
  [ChainId.ROPSTEN]: 'Ropsten',
  [ChainId.GÖRLI]: 'Görli',
  [ChainId.KOVAN]: 'Kovan',
  [ChainId.HYPERSPACE_TESTNET]: 'Hyperspace Testnet'
}

enum SupportedChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GOERLI = 5,
  KOVAN = 42,

  ARBITRUM_ONE = 42161,
  ARBITRUM_RINKEBY = 421611,
  AVALANCH = 43114,
  OPTIMISM = 10,
  OPTIMISTIC_KOVAN = 69,

  AURORA_MAINNET = 1313161554,

  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
  HYPERSPACE_TESTNET = 3141
}
const CHAIN_IDS_TO_NAMES = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.ROPSTEN]: 'ropsten',
  [SupportedChainId.RINKEBY]: 'rinkeby',
  [SupportedChainId.GOERLI]: 'goerli',
  [SupportedChainId.KOVAN]: 'kovan',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.POLYGON_MUMBAI]: 'polygon_mumbai',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum',
  [SupportedChainId.ARBITRUM_RINKEBY]: 'arbitrum_rinkeby',
  [SupportedChainId.OPTIMISM]: 'optimism',
  [SupportedChainId.OPTIMISTIC_KOVAN]: 'optimistic_kovan',
  [SupportedChainId.AURORA_MAINNET]: 'aurora',
  [SupportedChainId.AVALANCH]: 'avalanch',
  [SupportedChainId.HYPERSPACE_TESTNET]: 'hyperspace_testnet'
}

const getChainNameFromId = (id: string | number) => {
  // casting here may not be right but fine to return undefined if it's not a supported chain ID
  return CHAIN_IDS_TO_NAMES[id as SupportedChainId] || ''
}
const getChainIdFromName = (name: string) => {
  const entry = Object.entries(CHAIN_IDS_TO_NAMES).find(([_, n]) => n === name)
  const chainId = entry?.[0]
  return chainId ? parseInt(chainId) : undefined
}
const getParsedChainId = (parsedQs?: any) => {
  const chain = parsedQs?.chain
  if (!chain || typeof chain !== 'string') return { urlChain: undefined, urlChainId: undefined }

  return { urlChain: chain.toLowerCase(), urlChainId: getChainIdFromName(chain) }
}
export default function Header() {
  const dispatch = useDispatch<AppDispatch>()
  const setChainId = useSetChainId()
  const [isDark] = useDarkModeManager()
  const classes = useStyles({ isDark })
  const { account, chainId } = useActiveWeb3React()
  const { t } = useTranslation()
  const prevChainId = usePrevious(chainId)
  const history = useHistory()
  const parsedQs = useParsedQueryString()
  const { urlChain, urlChainId } = getParsedChainId(parsedQs)
  const node = useRef<HTMLDivElement>()
  const [active, setActive] = useState(false)
  const [showSwitch, setSwitchModal] = useState(false)
  const [userEthBalance, setUserEthBalance] = useState(CurrencyAmount.ether(JSBI.BigInt('0')))
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  // const userEthBalance = useETHBalances(account ? [account] : [])?.[account ?? '']
  // const [isDark] = useDarkModeManager()
  const [darkMode, toggleDarkMode] = useDarkModeManager()

  const toggleClaimModal = useToggleSelfClaimModal()

  const availableClaim: boolean = useUserHasAvailableClaim(account)

  const { claimTxn } = useUserHasSubmittedClaim(account ?? undefined)

  const aggregateBalance: TokenAmount | undefined = useAggregateUniBalance()

  const [showUniBalanceModal, setShowUniBalanceModal] = useState(false)
  const showClaimPopup = useShowClaimPopup()

  const countUpValue = aggregateBalance?.toFixed(0) ?? '0'
  const countUpValuePrevious = usePrevious(countUpValue) ?? '0'

  const switchNetwrok = async (newtwork: any) => {
    if (newtwork?.chainId && !account) {
      localStorage.setItem('networkdefault', newtwork.chainId)
    }

    if (!account) {
      let localvar = localStorage.getItem('networkdefault')
      let previousNetworkVar = localStorage.getItem('networkprevious')
      if (localvar === previousNetworkVar) {
        return
      }

      if (!previousNetworkVar) {
        localStorage.setItem('networkprevious', localvar || '')
        localvar = localStorage.getItem('networkdefault')
        previousNetworkVar = localStorage.getItem('networkprevious')
        history.replace({
          search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(newtwork.chainId))
        })
        // window.location.reload()
      } else if (localvar !== previousNetworkVar) {
        localStorage.setItem('networkprevious', localvar)
        localvar = localStorage.getItem('networkdefault')
        previousNetworkVar = localStorage.getItem('networkprevious')
        history.replace({
          search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(newtwork.chainId))
        })
        // window.location.reload()
      }
    }
    try {
      setSwitchModal(false)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        // params: [{ chainId: '0x1' }],
        params: [{ chainId: `0x${parseFloat(newtwork.chainId).toString(16)}` }]
      })

      // history.push({
      //   search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(newtwork.chainId))
      // })
      // const current_link = window.location.href;
      const nameofchain = getChainNameFromId(newtwork.chainId)
      // https://app.moxieswap.com
      // window.location.href = `https://kicktofarming.netlify.app/#/swap?chain=${nameofchain}&outputCurrency=ETH`
      // window.location.href = `http://localhost:3000/#/swap?chain=${nameofchain}&outputCurrency=ETH`
      if (CHAINLINKS[newtwork.chainId]) {
        dispatch(selectList(CHAINLINKS[newtwork.chainId]))
      }
      // window.location.reload(false);
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.

      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${parseFloat(newtwork.chainId).toString(16)}`,
                rpcUrls: [newtwork.rpcUrl],
                chainName: newtwork.title,
                nativeCurrency: newtwork?.nativeCurrency,
                blockExplorerUrls: newtwork?.blockExplorerUrls
              }
            ]
          })
          const nameofchain = getChainNameFromId(newtwork.chainId)
          // window.location.href = `https://app.moxieswap.com/#/swap?chain=${nameofchain}&outputCurrency=ETH`
          //window.location.href = `http://localhost:3000/#/swap?chain=${nameofchain}&outputCurrency=TFIL`
        } catch (addError) {
          // handle "add" error
          // history.replace({
          //   search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId))
          // })
        }
      }
    }
    // handle other "switch" errors
  }

  let currentNetwork = networks[0]
  if (chainId) {
    currentNetwork = networks.find(
      eachNetwork => eachNetwork.chainId.toLowerCase() === chainId.toString().toLowerCase()
    )
    if (!currentNetwork) {
      currentNetwork = networks[0]
    }
  }

  useEffect(() => {
    if (!chainId || !prevChainId) return

    // when network change originates from wallet or dropdown selector, just update URL
    if (chainId !== prevChainId) {
      history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId)) })
      // otherwise assume network change originates from URL
    } else if (urlChainId && urlChainId !== chainId) {
      const newtork = networks.find(eachNetwrok => eachNetwrok.chainId === urlChainId.toString())
      if (newtork) {
        switchNetwrok(newtork)
      }
    }
  }, [chainId, urlChainId, prevChainId, history, switchNetwrok])
  useEffect(() => {
    if (chainId && !urlChainId) {
      const localvar = localStorage.getItem('networkdefault')
      if (!localvar) {
        localStorage.setItem('networkdefault', 1)
      }

      history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId)) })
    }
  }, [chainId, history, urlChainId, urlChain])
  useEffect(() => {
    const rpc = rpcUrl()
    console.log({ rpc })
    const httpProvider = new Web3.providers.HttpProvider(rpc, {
      timeout: 10000
    } as HttpProviderOptions)

    const web3 = new Web3(httpProvider)
    const getAccountBalance = async () => {
      const userbalance = await web3.eth.getBalance(account)
      setUserEthBalance(CurrencyAmount.ether(JSBI.BigInt(userbalance.toString())))
    }
    if (account) {
      getAccountBalance()
    }
  }, [account, chainId])
  return (
    <HeaderFrame>
      <ClaimModal />
      <Modal isOpen={showUniBalanceModal} onDismiss={() => setShowUniBalanceModal(false)}>
        <UniBalanceContent setShowUniBalanceModal={setShowUniBalanceModal} />
      </Modal>
      <HeaderRow>
        <Title href=".">
          <UniIcon>
            <img width={'24px'} src={darkMode ? LogoDark : Logo} alt="logo" />
          </UniIcon>
        </Title>
        <HeaderLinks>
          <StyledNavLink id={`swap-nav-link`} to={'/swap'}>
            {t('swap')}
          </StyledNavLink>
          <StyledNavLink
            id={`pool-nav-link`}
            to={'/pool'}
            isActive={(match, { pathname }) =>
              Boolean(match) ||
              pathname.startsWith('/add') ||
              pathname.startsWith('/remove') ||
              pathname.startsWith('/create') ||
              pathname.startsWith('/find')
            }
          >
            {t('pool')}
          </StyledNavLink>
          {/* <StyledNavLink id={`stake-nav-link`} to={'/uni'}>
            UNI
          </StyledNavLink> */}
          <StyledNavLink id={`stake-nav-link`} to={'/vote'}>
            Vote
          </StyledNavLink>
          <StyledNavLink id={`loan-nav-link`} to={'/loan'}>
            Loans
          </StyledNavLink>
          {/* <StyledExternalLink id={`stake-nav-link`} href={'https://uniswap.info'}>
            Charts <span style={{ fontSize: '11px' }}>↗</span>
          </StyledExternalLink> */}
        </HeaderLinks>
      </HeaderRow>
      <HeaderControls>
        <HeaderElement>
          <HideSmall>
            {chainId && NETWORK_LABELS[chainId] && (
              <NetworkCard title={NETWORK_LABELS[chainId]}>{NETWORK_LABELS[chainId]}</NetworkCard>
            )}
          </HideSmall>
          {availableClaim && !showClaimPopup && (
            <UNIWrapper onClick={toggleClaimModal}>
              <UNIAmount active={!!account && !availableClaim} style={{ pointerEvents: 'auto' }}>
                <TYPE.white padding="0 2px">
                  {claimTxn && !claimTxn?.receipt ? <Dots>Claiming UNI</Dots> : 'Claim UNI'}
                </TYPE.white>
              </UNIAmount>
              <CardNoise />
            </UNIWrapper>
          )}
          {/* {!availableClaim && aggregateBalance && (
            <UNIWrapper onClick={() => setShowUniBalanceModal(true)}>
              <UNIAmount active={!!account && !availableClaim} style={{ pointerEvents: 'auto' }}>
                {account && (
                  <HideSmall>
                    <TYPE.white
                      style={{
                        paddingRight: '.4rem'
                      }}
                    >
                      <CountUp
                        key={countUpValue}
                        isCounting
                        start={parseFloat(countUpValuePrevious)}
                        end={parseFloat(countUpValue)}
                        thousandsSeparator={','}
                        duration={1}
                      />
                    </TYPE.white>
                  </HideSmall>
                )}
                FIL
              </UNIAmount>
              <CardNoise />
            </UNIWrapper>
          )} */}
          <AccountElement active={!!account} style={{ pointerEvents: 'auto' }}>
            {account && userEthBalance ? (
              <BalanceText style={{ flexShrink: 0 }} pl="0.75rem" pr="0.5rem" fontWeight={500}>
                {userEthBalance?.toSignificant(4)} TFIL
              </BalanceText>
            ) : null}
            <Web3Status />
          </AccountElement>
        </HeaderElement>
        <HeaderElementWrap>
          <StyledMenuButton onClick={() => toggleDarkMode()}>
            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
          </StyledMenuButton>
          <Menu />
        </HeaderElementWrap>
      </HeaderControls>
    </HeaderFrame>
  )
}
