import { BigNumber } from '@ethersproject/bignumber'

import { TransactionResponse, Web3Provider } from '@ethersproject/providers'
import { Currency, currencyEquals, ETHER, TokenAmount, WETH } from '@uniswap/sdk'
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Plus } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { ButtonError, ButtonLight, ButtonPrimary, ButtonSecondary } from '../../components/Button'
import { BlueCard, LightCard } from '../../components/Card'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import { AddRemoveTabs } from '../../components/NavigationTabs'
import { MinimalPositionCard } from '../../components/PositionCard'
import Row, { RowBetween, RowFlat } from '../../components/Row'

import { GARGANTUA_TOKEN, LOAN_CONTRACT, ROUTER_ADDRESS } from '../../constants'
import { PairState } from '../../data/Reserves'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import useTransactionDeadline from '../../hooks/useTransactionDeadline'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from '../../state/mint/hooks'

import { useTransactionAdder } from '../../state/transactions/hooks'
import { useIsExpertMode, useUserSlippageTolerance } from '../../state/user/hooks'
import { TYPE } from '../../theme'
import { calculateGasMargin, calculateSlippageAmount, getContract, getRouterContract } from '../../utils'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import AppBody from '../AppBody'
import { Dots, Wrapper } from '../Pool/styleds'
import { ConfirmAddModalBottom } from './ConfirmAddModalBottom'
import { currencyId } from '../../utils/currencyId'
import { PoolPriceBar } from './PoolPriceBar'
import { useIsTransactionUnsupported } from 'hooks/Trades'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import { useContractDataCallback, useLendAmountCallback, useLenderAmountCallback } from 'hooks/useLoanCallback'
import styled from 'styled-components'
import { darken } from 'polished'
import { Input as NumericalInput } from '../../components/LoanInput'
import { formatEther, hexlify, parseEther } from 'ethers/lib/utils'
import loanAbi from '../../constants/abis/loan-rewarder.json'
import gargantuaAbi from '../../constants/abis/gargantuaErc20.json'

const StyledInput = styled.input<{ error?: boolean; fontSize?: string; align?: string }>`
  color: ${({ error, theme }) => (error ? theme.red1 : theme.text1)};
  width: 0;
  position: relative;
  font-weight: 500;
  outline: none;
  border: none;
  flex: 1 1 auto;
  background-color: ${({ theme }) => theme.bg1};
  font-size: ${({ fontSize }) => fontSize ?? '24px'};
  text-align: ${({ align }) => align && align};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0px;
  -webkit-appearance: textfield;

  [type='number'] {
    -moz-appearance: textfield;
  }

  ::-webkit-outer-spin-button,
  ::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }

  ::placeholder {
    color: ${({ theme }) => theme.text4};
  }
`

const InputPanel = styled.div<{ hideInput?: boolean }>`
  ${({ theme }) => theme.flexColumnNoWrap}
  position: relative;
  border-radius: ${({ hideInput }) => (hideInput ? '8px' : '20px')};
  background-color: ${({ theme }) => theme.bg2};
  z-index: 1;
`
const Container = styled.div<{ hideInput: boolean }>`
  border-radius: ${({ hideInput }) => (hideInput ? '8px' : '20px')};
  border: 1px solid ${({ theme }) => theme.bg2};
  background-color: ${({ theme }) => theme.bg1};
`

const LabelRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  color: ${({ theme }) => theme.text1};
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.75rem 1rem 0 1rem;
  span:hover {
    cursor: pointer;
    color: ${({ theme }) => darken(0.2, theme.text2)};
  }
`

const InputRow = styled.div<{ selected: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  padding: ${({ selected }) => (selected ? '0.75rem 0.5rem 0.75rem 1rem' : '0.75rem 0.75rem 0.75rem 1rem')};
`

// const LoanInput = styled.input`
//   color: ${({ theme }) => (error ? theme.red1 : theme.text1)};
//   width: 0;
//   position: relative;
//   font-weight: 500;
//   outline: none;
//   border: none;
//   flex: 1 1 auto;
// `

// const styledInputFn = ({ className, value, placeholder }) => {
//   return (
//     <StyledInput
//       className={className}
//       value={value}
//       placeholder={placeholder}
//       onChange={event => setActorID(event.target.value || '')}
//     />
//   )
// }
export default function Loan({
  match: {
    params: { currencyIdA, currencyIdB }
  },
  history
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string }>) {
  const { account, chainId, library } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  const currencyA = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)

  const oneCurrencyIsWETH = Boolean(
    chainId &&
      ((currencyA && currencyEquals(currencyA, WETH[chainId])) ||
        (currencyB && currencyEquals(currencyB, WETH[chainId])))
  )

  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  const expertMode = useIsExpertMode()

  // mint state
  const { independentField, typedValue, otherTypedValue } = useMintState()
  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error
  } = useDerivedMintInfo(currencyA ?? undefined, currencyB ?? undefined)

  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [formattedInput, setFormattedInput] = useState<string>('0')
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // txn values
  const deadline = useTransactionDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState<string>('')

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field])
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0')
      }
    },
    {}
  )

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], ROUTER_ADDRESS)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], ROUTER_ADDRESS)
  const [lendValue, setLendValue] = useState<string>('0')
  const [actorID, setActorID] = useState<string>('0')
  const [actorData, setActorData] = useState<any>()

  const [dealID, setDealID] = useState<string>('0')

  const [web3Provider, setWeb3Provider] = useState<any>(null)
  const [accountAddress, setAccountAddress] = useState<string>('')
  const [loanMode, setLoanMode] = useState<boolean>(true)
  const [contractData] = useContractDataCallback()
  const [lenderData] = useLenderAmountCallback()
  const addTransaction = useTransactionAdder()

  useEffect(() => {
    const provider = window.ethereum

    if (typeof provider !== 'undefined') {
      //Metamask is installed
      provider
        .request({ method: 'eth_requestAccounts' })
        .then((accounts: any) => {
          console.log('All accounts: ', accounts)
          setAccountAddress(accounts[0])
        })
        .catch((err: any) => {
          console.log(err)
        })
    }
    const web3Provider = new Web3Provider(window.ethereum)
    setWeb3Provider(web3Provider)
  }, [])
  // function to take loanContract as input and call the borrowerData() function and return all the details
  async function getBorrowerData(actorID: string) {
    if (!web3Provider && !accountAddress && actorID !== '0') return
    console.log('Check actorID: ', actorID)
    const loanContract = getContract(LOAN_CONTRACT, loanAbi, web3Provider, accountAddress)
    const borrowerData = await loanContract.borrowerData(actorID)
    console.log('borrowerData Called : ', borrowerData)
    const borrowedAmount = parseInt(borrowerData[0]._hex)
    const interestPercent = parseInt(borrowerData[1]._hex)
    const emiAmount = borrowerData[2]
    const returnedAmount = parseInt(borrowerData[3]._hex)
    const currCreditFactor = parseInt(borrowerData[4]._hex)
    const creditScore = parseInt(borrowerData[5]._hex)
    const dealId = parseInt(borrowerData[6]._hex)
    const loanPeriod = parseInt(borrowerData[7]._hex)
    console.log(
      'borrowedAmount, interestPercent, emiAmount, returnedAmount, currCreditFactor, creditScore, dealId, loanPeriod: ',
      borrowedAmount,
      interestPercent,
      emiAmount,
      returnedAmount,
      currCreditFactor,
      creditScore,
      dealId,
      loanPeriod
    )
    return {
      borrowedAmount,
      interestPercent,
      emiAmount,
      returnedAmount,
      currCreditFactor,
      creditScore,
      dealId,
      loanPeriod
    }
  }

  async function OnAddLend(lendValue: string) {
    if (!web3Provider && !accountAddress && lendValue !== '0') return
    console.log('Check lendValue: ', lendValue)
    const contract = getContract(LOAN_CONTRACT, loanAbi, web3Provider, accountAddress)
    const amount = parseEther(lendValue)
    const tx = await contract.lendAmount({ value: amount })
    await tx.wait()
    console.log('Transaction successful!')
  }
  async function OnRevokeLend(lendValue: string) {
    if (!web3Provider && !accountAddress && lendValue !== '0') return
    console.log('Check lendValue: ', lendValue)
    const gargantuaContract = getContract(GARGANTUA_TOKEN, gargantuaAbi, web3Provider, accountAddress)
    // check accountAddress for Gargantua token balance and allowance of lendValue amount and approve the LOAN_CONTRACT to spend the lendValue amount if not already approved
    const gargantuaBalance = await gargantuaContract.balanceOf(accountAddress)
    const gargantuaAllowance = await gargantuaContract.allowance(accountAddress, LOAN_CONTRACT)
    console.log(
      'Balance and allowance: ',
      gargantuaBalance,
      gargantuaAllowance,
      parseInt(parseEther(lendValue)._hex),
      parseInt(gargantuaBalance?._hex),
      parseInt(gargantuaAllowance?._hex)
    )
    console.log('Inside approve: ', lendValue, parseEther(lendValue))
    if (parseInt(gargantuaBalance?._hex) < parseInt(parseEther(lendValue)._hex)) {
      console.log('Insufficient Gargantua token balance')
      return
    }
    if (parseInt(gargantuaAllowance?._hex) < parseInt(parseEther(lendValue)._hex)) {
      const tx = await gargantuaContract.approve(LOAN_CONTRACT, parseEther(lendValue))
      await tx.wait()
      console.log('Gargantua token approved')
    }
    const loanContract = getContract(LOAN_CONTRACT, loanAbi, web3Provider, accountAddress)
    // call getLenderAmount function to get lendedAmount and lendPool to calculate sharePercent and then calculate interest and then call revokeAmount function to revoke the lendValue amount
    const lenderData = await loanContract.getLenderAmount(accountAddress)
    console.log('lenderData Called : ', lenderData)
    const lendedAmount = parseInt(lenderData[0]._hex)
    const lendPool = parseInt(lenderData[1]._hex)
    const loanPool = parseInt(lenderData[2]._hex)
    const totalInterestAmount = await loanContract.totalInterestAmount()
    console.log('totalInterestAmount Called : ', totalInterestAmount)
    const sharePercent = (lendedAmount * 100) / lendPool
    const interest = (sharePercent * parseInt(totalInterestAmount._hex)) / 100
    console.log(
      'sharePercent and interest: ',
      sharePercent,
      interest,
      lendValue,
      formatEther(interest.toString()),
      lendPool,
      loanPool
    )
    const tx = await loanContract.revokeLend(parseEther(formatEther(interest.toString())), parseEther(lendValue))
    await tx.wait()
    console.log('Revoke successful!')
  }

  async function fetchActorDetails(actorID: string) {
    console.log('Fetching Actor Details...')
    setActorID(actorID)
    if (actorID.length > 3) {
      const borrowerData = await getBorrowerData(actorID)
      setActorData(borrowerData)
      console.log('borrowerData Called : ', borrowerData)
    }
  }

  async function OnBorrowAmount(actorID: string, dealID: string) {
    try {
      if (!web3Provider && !accountAddress && actorID !== '0' && dealID !== '0') return
      console.log('Check actorID: ', actorID, ' Check dealID: ', dealID)
      const loanPeriod = 6
      const loanContract = getContract(LOAN_CONTRACT, loanAbi, web3Provider, accountAddress)
      // call borrowerData() to get the borrower details like uint borrowedAmount;
      // and check if the borrower has remaining borrowedAmount to stop from borrowing again
      const borrowerData = await getBorrowerData(actorID)
      console.log('borrowerData Called : ', borrowerData)
      if (borrowerData && borrowerData?.borrowedAmount > 0) {
        console.log('Borrower has already borrowed amount')
        return
      }
      // call borrowAmount function to borrow the amount
      const tx = await loanContract.borrowAmount(actorID, dealID, loanPeriod)
      await tx.wait()
      console.log('Borrow successful!')
    } catch (error) {
      console.log('Error in Borrowing: ', error)
    }
  }

  async function OnPayEmi(actorID: string) {
    if (!web3Provider && !accountAddress && actorID !== '0') return
    console.log('Check actorID: ', actorID)
    const loanContract = getContract(LOAN_CONTRACT, loanAbi, web3Provider, accountAddress)

    // call borrowerData() to get the borrower details like uint borrowedAmount;
    const borrowerData = await getBorrowerData(actorID)
    console.log('borrowerData Called : ', borrowerData)
    // check if the borrower.borrowedAmount is greater than 0 to let the borrower pay the emi also check if borrower.borrowedAmount > borrower.emiAmount to stop the borrower from paying more than the emiAmount in 2 different if loops
    if (borrowerData && borrowerData?.borrowedAmount > 0) {
      if (borrowerData?.borrowedAmount > parseInt(borrowerData?.emiAmount._hex)) {
        const tx = await loanContract.payEmi(actorID, {
          value: borrowerData?.emiAmount
        })
        const res = await tx.wait()
        console.log('Emi paid successfully!', res)
      } else {
        const tx = await loanContract.setCloseLoan(actorID)
        const res = await tx.wait()
        console.log('Borrower has already paid the emi', res)
      }
    }
  }

  async function onAdd() {
    if (!chainId || !library || !account) return
    const router = getRouterContract(chainId, library, account)

    const { [Field.CURRENCY_A]: parsedAmountA, [Field.CURRENCY_B]: parsedAmountB } = parsedAmounts
    if (!parsedAmountA || !parsedAmountB || !currencyA || !currencyB || !deadline) {
      return
    }

    const amountsMin = {
      [Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? 0 : allowedSlippage)[0],
      [Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? 0 : allowedSlippage)[0]
    }

    let estimate,
      method: (...args: any) => Promise<TransactionResponse>,
      args: Array<string | string[] | number>,
      value: BigNumber | null
    if (currencyA === ETHER || currencyB === ETHER) {
      const tokenBIsETH = currencyB === ETHER
      estimate = router.estimateGas.addLiquidityETH
      method = router.addLiquidityETH
      args = [
        wrappedCurrency(tokenBIsETH ? currencyA : currencyB, chainId)?.address ?? '', // token
        (tokenBIsETH ? parsedAmountA : parsedAmountB).raw.toString(), // token desired
        amountsMin[tokenBIsETH ? Field.CURRENCY_A : Field.CURRENCY_B].toString(), // token min
        amountsMin[tokenBIsETH ? Field.CURRENCY_B : Field.CURRENCY_A].toString(), // eth min
        account,
        deadline.toHexString()
      ]
      value = BigNumber.from((tokenBIsETH ? parsedAmountB : parsedAmountA).raw.toString())
    } else {
      estimate = router.estimateGas.addLiquidity
      method = router.addLiquidity
      args = [
        wrappedCurrency(currencyA, chainId)?.address ?? '',
        wrappedCurrency(currencyB, chainId)?.address ?? '',
        parsedAmountA.raw.toString(),
        parsedAmountB.raw.toString(),
        amountsMin[Field.CURRENCY_A].toString(),
        amountsMin[Field.CURRENCY_B].toString(),
        account,
        deadline.toHexString()
      ]
      value = null
    }

    setAttemptingTxn(true)
    await estimate(...args, value ? { value } : {})
      .then(estimatedGasLimit =>
        method(...args, {
          ...(value ? { value } : {}),
          gasLimit: calculateGasMargin(estimatedGasLimit)
        }).then(response => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary:
              'Add ' +
              parsedAmounts[Field.CURRENCY_A]?.toSignificant(3) +
              ' ' +
              currencies[Field.CURRENCY_A]?.symbol +
              ' and ' +
              parsedAmounts[Field.CURRENCY_B]?.toSignificant(3) +
              ' ' +
              currencies[Field.CURRENCY_B]?.symbol
          })

          setTxHash(response.hash)

          ReactGA.event({
            category: 'Liquidity',
            action: 'Add',
            label: [currencies[Field.CURRENCY_A]?.symbol, currencies[Field.CURRENCY_B]?.symbol].join('/')
          })
        })
      )
      .catch(error => {
        setAttemptingTxn(false)
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          console.error(error)
        }
      })
  }

  const modalHeader = () => {
    return noLiquidity ? (
      <AutoColumn gap="20px">
        <LightCard mt="20px" borderRadius="20px">
          <RowFlat>
            <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
              {currencies[Field.CURRENCY_A]?.symbol + '/' + currencies[Field.CURRENCY_B]?.symbol}
            </Text>
            <DoubleCurrencyLogo
              currency0={currencies[Field.CURRENCY_A]}
              currency1={currencies[Field.CURRENCY_B]}
              size={30}
            />
          </RowFlat>
        </LightCard>
      </AutoColumn>
    ) : (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {liquidityMinted?.toSignificant(6)}
          </Text>
          <DoubleCurrencyLogo
            currency0={currencies[Field.CURRENCY_A]}
            currency1={currencies[Field.CURRENCY_B]}
            size={30}
          />
        </RowFlat>
        <Row>
          <Text fontSize="24px">
            {currencies[Field.CURRENCY_A]?.symbol + '/' + currencies[Field.CURRENCY_B]?.symbol + ' Pool Tokens'}
          </Text>
        </Row>
        <TYPE.italic fontSize={12} textAlign="left" padding={'8px 0 0 0 '}>
          {`Output is estimated. If the price changes by more than ${allowedSlippage /
            100}% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
      <ConfirmAddModalBottom
        price={price}
        currencies={currencies}
        parsedAmounts={parsedAmounts}
        noLiquidity={noLiquidity}
        onAdd={onAdd}
        poolTokenPercentage={poolTokenPercentage}
      />
    )
  }

  const pendingText = `Supplying ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)} ${
    currencies[Field.CURRENCY_A]?.symbol
  } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)} ${currencies[Field.CURRENCY_B]?.symbol}`

  const handleCurrencyASelect = useCallback(
    (currencyA: Currency) => {
      const newCurrencyIdA = currencyId(currencyA)
      if (newCurrencyIdA === currencyIdB) {
        history.push(`/loan/${currencyIdB}`)
      } else {
        history.push(`/loan/${newCurrencyIdA}`)
      }
    },
    [currencyIdB, history, currencyIdA]
  )
  const handleCurrencyBSelect = useCallback(
    (currencyB: Currency) => {
      const newCurrencyIdB = currencyId(currencyB)
      if (currencyIdA === newCurrencyIdB) {
        if (currencyIdB) {
          history.push(`/add/${currencyIdB}/${newCurrencyIdB}`)
        } else {
          history.push(`/add/${newCurrencyIdB}`)
        }
      } else {
        history.push(`/add/${currencyIdA ? currencyIdA : 'ETH'}/${newCurrencyIdB}`)
      }
    },
    [currencyIdA, history, currencyIdB]
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
    }
    setTxHash('')
  }, [onFieldAInput, txHash])

  const isCreate = history.location.pathname.includes('/create')

  const addIsUnsupported = useIsTransactionUnsupported(currencies?.CURRENCY_A, currencies?.CURRENCY_B)

  return (
    <>
      <AppBody>
        <AddRemoveTabs creating={isCreate} adding={false} loan={loanMode} borrow={!loanMode} />
        <Wrapper>
          <TransactionConfirmationModal
            isOpen={showConfirm}
            onDismiss={handleDismissConfirmation}
            attemptingTxn={attemptingTxn}
            hash={txHash}
            content={() => (
              <ConfirmationModalContent
                title={noLiquidity ? 'You are creating a pool' : 'You will receive'}
                onDismiss={handleDismissConfirmation}
                topContent={modalHeader}
                bottomContent={modalBottom}
              />
            )}
            pendingText={pendingText}
            currencyToAdd={pair?.liquidityToken}
          />
          <AutoColumn gap="20px">
            {noLiquidity ||
              (isCreate ? (
                <ColumnCenter>
                  <BlueCard>
                    <AutoColumn gap="10px">
                      <TYPE.link fontWeight={600} color={'primaryText1'}>
                        You are the first liquidity provider.
                      </TYPE.link>
                      <TYPE.link fontWeight={400} color={'primaryText1'}>
                        The ratio of tokens you add will set the price of this pool.
                      </TYPE.link>
                      <TYPE.link fontWeight={400} color={'primaryText1'}>
                        Once you are happy with the rate click supply to review.
                      </TYPE.link>
                    </AutoColumn>
                  </BlueCard>
                </ColumnCenter>
              ) : (
                <ColumnCenter>
                  <BlueCard>
                    <AutoColumn gap="10px">
                      <TYPE.link fontWeight={400} color={'primaryText1'}>
                        <b>Tips:</b>{' '}
                        {loanMode
                          ? `When you Lend Tokens, you will receive pool tokens representing your position. When
                        you want to revoke your Lent amount this pool tokens will be deducted.`
                          : `When you Borrow Tokens, depending on you credit factor the amount of tFil will be borrowed from the Loan pool and you have to pay back the amount borrowed plus interest in 6 Easy Installments.`}
                      </TYPE.link>
                    </AutoColumn>
                  </BlueCard>
                </ColumnCenter>
              ))}
            {loanMode ? (
              <InputPanel id={'lendAmount'}>
                <Container hideInput={false}>
                  <LabelRow>
                    <RowBetween>
                      <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
                        Input
                      </TYPE.body>
                      {/* {account && (
                      <TYPE.body
                        color={theme.text2}
                        fontWeight={500}
                        fontSize={14}
                        style={{ display: 'inline', cursor: 'pointer' }}
                      >
                        Balance:
                      </TYPE.body>
                    )} */}
                    </RowBetween>
                  </LabelRow>
                  <InputRow selected={true}>
                    <StyledInput
                      className="token-amount-input"
                      value={lendValue}
                      placeholder={'0.1'}
                      onChange={(event: any) => setLendValue(event.target.value || '')}
                    />
                  </InputRow>
                </Container>
              </InputPanel>
            ) : (
              <>
                <InputPanel id={'actorID'}>
                  <Container hideInput={false}>
                    <LabelRow>
                      <RowBetween>
                        <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
                          Actor ID
                        </TYPE.body>
                        {/* {account && (
                     <TYPE.body
                       color={theme.text2}
                       fontWeight={500}
                       fontSize={14}
                       style={{ display: 'inline', cursor: 'pointer' }}
                     >
                       Balance:
                     </TYPE.body>
                   )} */}
                      </RowBetween>
                    </LabelRow>
                    <InputRow selected={true}>
                      <StyledInput
                        className="token-amount-input"
                        value={actorID}
                        placeholder={'0'}
                        onChange={event => fetchActorDetails(event.target.value || '')}
                      />
                    </InputRow>
                  </Container>
                </InputPanel>
                {actorID?.length > 2 ? (
                  <InputPanel id={'dealID'}>
                    <Container hideInput={false}>
                      <LabelRow>
                        <RowBetween>
                          <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
                            Deal ID
                          </TYPE.body>
                          {/* {account && (
                     <TYPE.body
                       color={theme.text2}
                       fontWeight={500}
                       fontSize={14}
                       style={{ display: 'inline', cursor: 'pointer' }}
                     >
                       Balance:
                     </TYPE.body>
                   )} */}
                        </RowBetween>
                      </LabelRow>
                      <InputRow selected={true}>
                        <StyledInput
                          className="token-amount-input"
                          value={dealID}
                          placeholder={'0'}
                          onChange={event => setDealID(event.target.value || '')}
                        />
                      </InputRow>
                    </Container>
                  </InputPanel>
                ) : null}
              </>
            )}

            {
              <>
                <LightCard padding="0px" borderRadius={'20px'}>
                  <RowBetween padding="1rem">
                    <TYPE.subHeader fontWeight={500} fontSize={14}>
                      {!loanMode ? 'Debt and Loan Details' : 'Pool Share'}
                    </TYPE.subHeader>
                  </RowBetween>{' '}
                  <LightCard padding="1rem" borderRadius={'20px'}>
                    {loanMode && contractData && lenderData ? (
                      <PoolPriceBar
                        loanMode={loanMode}
                        contractData={contractData}
                        lenderData={lenderData}
                        borrowData={actorData}
                      />
                    ) : actorData && !loanMode ? (
                      <PoolPriceBar
                        loanMode={loanMode}
                        contractData={contractData}
                        lenderData={lenderData}
                        borrowData={actorData}
                      />
                    ) : null}
                  </LightCard>
                </LightCard>
              </>
            }

            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
            ) : (
              <AutoColumn gap={'md'}>
                {/* <ButtonError
                  onClick={() => {
                    expertMode ? onAdd() : setShowConfirm(true)
                  }}
                  disabled={!isValid || approvalA !== ApprovalState.APPROVED || approvalB !== ApprovalState.APPROVED}
                  error={!isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
                >
                  <Text fontSize={20} fontWeight={500}>
                    {error ?? 'Supply'}
                  </Text>
                </ButtonError> */}
                {loanMode ? (
                  <>
                    <ButtonLight disabled={lendValue === '0' || lendValue === ''} onClick={() => OnAddLend(lendValue)}>
                      <Text fontSize={20} fontWeight={500}>
                        Lend
                      </Text>
                    </ButtonLight>
                    {parseInt(lenderData?.lentAmount) > 0 ? (
                      <ButtonSecondary disabled={lendValue === '0'} onClick={() => OnRevokeLend(lendValue)}>
                        <Text fontSize={20} fontWeight={500}>
                          Revoke
                        </Text>
                      </ButtonSecondary>
                    ) : (
                      ''
                    )}
                  </>
                ) : (
                  <>
                    {actorData && parseInt(actorData?.borrowedAmount) > 0 ? (
                      <ButtonPrimary disabled={actorID.length < 3 || actorID === ''} onClick={() => OnPayEmi(actorID)}>
                        <Text fontSize={20} fontWeight={500}>
                          Pay EMI
                        </Text>
                      </ButtonPrimary>
                    ) : (
                      <ButtonLight
                        disabled={
                          actorID === '0' ||
                          dealID === '' ||
                          actorID === '' ||
                          dealID === '0' ||
                          parseInt(actorData?.borrowedAmount) > 0
                        }
                        onClick={() => OnBorrowAmount(actorID, dealID)}
                      >
                        <Text fontSize={20} fontWeight={500}>
                          Borrow
                        </Text>
                      </ButtonLight>
                    )}
                  </>
                )}

                <div style={{ width: '100%', display: 'flex', alignContent: 'center', justifyContent: 'center' }}>
                  {loanMode ? (
                    <p onClick={() => setLoanMode(!loanMode)}>
                      {/* eslint-disable-next-line react/no-unescaped-entities  */}
                      Don't want to lend? Borrow instead
                    </p>
                  ) : (
                    <p onClick={() => setLoanMode(!loanMode)}>
                      {/* eslint-disable-next-line react/no-unescaped-entities  */}
                      Don't want to Borrow? Lend instead
                    </p>
                  )}
                </div>
              </AutoColumn>
            )}
          </AutoColumn>
        </Wrapper>
      </AppBody>
      {/* {!addIsUnsupported ? (
        pair && !noLiquidity && pairState !== PairState.INVALID ? (
          <AutoColumn style={{ minWidth: '20rem', width: '100%', maxWidth: '400px', marginTop: '1rem' }}>
            <MinimalPositionCard showUnwrapped={oneCurrencyIsWETH} pair={pair} />
          </AutoColumn>
        ) : null
      ) : (
        <UnsupportedCurrencyFooter
          show={addIsUnsupported}
          currencies={[currencies.CURRENCY_A, currencies.CURRENCY_B]}
        />
      )} */}
    </>
  )
}
