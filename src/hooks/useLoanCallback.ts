import { BigNumber } from '@ethersproject/bignumber'
import { useCallback } from 'react'
import { useActiveWeb3React } from './index'
import { useLoanContract } from './useContract'
import { callRpc } from 'utils/loanUtils'

export function useLendCallback(tokenToSend?: any): () => Promise<void> {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()

  const lendCallback = useCallback(async (): Promise<void> => {
    if (!loanContract) {
      console.error('loanContract is null')
      return
    }
    const priorityFee = await callRpc('eth_maxPriorityFeePerGas')
    return loanContract
      .lendAmount({
        maxPriorityFeePerGas: priorityFee,
        value: BigNumber.from(tokenToSend)
      })
      .then((response: any) => {
        console.log(response)
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [])

  return lendCallback
}

export function useBorrowCallback(actorid?: any, dealid?: any, loanPeriod?: any): () => Promise<void> {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()

  const borrowCallback = useCallback(async (): Promise<void> => {
    if (!loanContract) {
      console.error('loanContract is null')
      return
    }
    const priorityFee = await callRpc('eth_maxPriorityFeePerGas')
    return loanContract
      .borrowAmount(actorid, dealid, loanPeriod, {
        maxPriorityFeePerGas: priorityFee
      })
      .then((response: any) => {
        console.log(response)
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [])

  return borrowCallback
}

export function useLenderDataCallback(lenderAddress?: any, sharePercent?: any): () => Promise<void> {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()

  const lenderDataCallback = useCallback(async (): Promise<void> => {
    if (!loanContract) {
      console.error('loanContract is null')
      return
    }
    loanContract
      .getLenderData(lenderAddress, sharePercent, {})
      .then((response: any) => {
        console.log(response)
        return response
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [])

  return lenderDataCallback
}

export function useContractDataCallback(actorid?: any, dealid?: any, loanPeriod?: any): () => Promise<void> {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()

  const contractDataCallback = useCallback(async (): Promise<void> => {
    if (!loanContract) {
      console.error('loanContract is null')
      return
    }
    loanContract.borrowAmount
      .contractPublicData()
      .then((response: any) => {
        console.log(response)
        return response
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [])

  return contractDataCallback
}

//   export function useLendCallback(tokenToSend?: any): () => Promise<void> {
//     const { account } = useActiveWeb3React()
//     const loanContract = useLoanContract()

//     const lendCallback = useCallback(async (): Promise<void> => {
//       if (!loanContract) {
//         console.error('loanContract is null')
//         return
//       }
//       const priorityFee = await callRpc('eth_maxPriorityFeePerGas')
//       return loanContract
//         .lendAmount({
//           maxPriorityFeePerGas: priorityFee,
//           value: BigNumber.from(tokenToSend)
//         })
//         .then((response: any) => {
//           console.log(response)
//         })
//         .catch((error: Error) => {
//           console.debug('Failed to approve token', error)
//           throw error
//         })
//     }, [])

//     return lendCallback
//   }
