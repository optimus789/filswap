import { BigNumber } from '@ethersproject/bignumber'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useActiveWeb3React } from './index'
import { useLoanContract } from './useContract'
import { callRpc } from 'utils/loanUtils'
import { parseEther } from 'ethers/lib/utils'

export function useContractDataCallback(): [any] {
  const loanContract = useLoanContract()
  const contractDataState = useMemo(() => {
    return {
      lentAmount: 0,
      lentCount: 0,
      totalInterestAmount: 0,
      data: false
    }
  }, [])
  const contractDataCallback = useCallback(async (): Promise<void> => {
    if (contractDataState.data) return
    return loanContract
      ?.contractPublicData()
      .then((response: any) => {
        console.log('This is the response: ', response)
        contractDataState.lentAmount = response[0]._hex
        contractDataState.lentCount = response[1]._hex
        contractDataState.totalInterestAmount = response[2]._hex
        contractDataState.data = true
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [contractDataState, loanContract])
  useEffect(() => {
    if (!contractDataState.data) {
      contractDataCallback()
    }
  }, [contractDataState, contractDataCallback])

  return [contractDataState]
}

export function useLenderAmountCallback(): [any] {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()
  const lenderDataState = useMemo(() => {
    return {
      lentAmount: 0,

      data: false
    }
  }, [])
  const lenderAmountCallback = useCallback(async (): Promise<void> => {
    if (lenderDataState.data && !account) return
    return loanContract
      ?.getLenderAmount(account, {})
      .then((response: any) => {
        console.log(response)
        console.log('This is the response: ', response)
        lenderDataState.lentAmount = response[0]._hex
        lenderDataState.data = true
        return response
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [account, lenderDataState, loanContract])
  useEffect(() => {
    if (!lenderDataState.data) {
      lenderAmountCallback()
    }
  }, [lenderDataState, lenderAmountCallback])

  return [lenderDataState]
}

export function usePayEmiCallback(): [any] {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()
  const payEmiState = useMemo(() => {
    return {
      emiAmount: 0,
      data: false
    }
  }, [])
  const payEmiCallback = useCallback(async (): Promise<void> => {
    if (payEmiState.data && !account) return
    return loanContract

      ?.payEmi(account, {})
      .then((response: any) => {
        console.log(response)
        console.log('This is the response: ', response)
        payEmiState.emiAmount = response[0]._hex
        payEmiState.data = true
        return response
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [account, payEmiState, loanContract])
  useEffect(() => {
    if (!payEmiState.data) {
      payEmiCallback()
    }
  }, [payEmiState, payEmiCallback])

  return [payEmiState]
}

// create a useBorrowCallback hook to call the payEmi function in the loan contract like useLenderAmountCallback hook

export function useBorrowCallback(): [any] {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()

  const borrowState = useMemo(() => {
    return {
      borrowAmount: 0,
      data: false
    }
  }, [])
  const borrowCallback = useCallback(async (): Promise<void> => {
    if (borrowState.data && !account) return
    return loanContract

      ?.borrowAmount(account, {})
      .then((response: any) => {
        console.log('This is the response: ', response)
        borrowState.borrowAmount = response[0]._hex
        borrowState.data = true
        return response
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [account, borrowState, loanContract])
  useEffect(() => {
    if (!borrowState.data) {
      borrowCallback()
    }
  }, [borrowState, borrowCallback])

  return [borrowState]
}

// same type of hook now for useLendAmountCallback

export function useLendAmountCallback(value?: string): [any, () => Promise<void>] {
  const { account } = useActiveWeb3React()
  const loanContract = useLoanContract()

  const lendState = useMemo(() => {
    return {
      lendAmount: 0,
      data: false
    }
  }, [])
  const lendCallback = useCallback(async (): Promise<void> => {
    console.log(typeof value, lendState)
    if (lendState.data && !account) return
    if (!value) {
      console.error('Missing Amount to lend')
      return
    }
    console.log('Value is: ', value)

    return loanContract
      ?.lendAmount({ value: parseEther(value) })
      .then((response: any) => {
        console.log('This is the response of lendAmount: ', response)
        // lendState.lendAmount = response[0]._hex
        lendState.data = true
        return response
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [account, lendState, loanContract])
  // useEffect(() => {
  //   if (!lendState.data) {
  //     lendCallback()
  //   }
  // }, [lendState, lendCallback])

  return [lendState, lendCallback]
}

// export function useLendCallback(tokenToSend?: any): () => Promise<void> {
//   const { account } = useActiveWeb3React()
//   const loanContract = useLoanContract()

//   const lendCallback = useCallback(async (): Promise<void> => {
//     if (!loanContract) {
//       console.error('loanContract is null')
//       return
//     }
//     const priorityFee = await callRpc('eth_maxPriorityFeePerGas')
//     return loanContract
//       .lendAmount({
//         maxPriorityFeePerGas: priorityFee,
//         value: BigNumber.from(tokenToSend)
//       })
//       .then((response: any) => {
//         console.log(response)
//       })
//       .catch((error: Error) => {
//         console.debug('Failed to approve token', error)
//         throw error
//       })
//   }, [])

//   return lendCallback
// }

// export function useBorrowCallback(actorid?: any, dealid?: any, loanPeriod?: any): () => Promise<void> {
//   const { account } = useActiveWeb3React()
//   const loanContract = useLoanContract()

//   const borrowCallback = useCallback(async (): Promise<void> => {
//     if (!loanContract) {
//       console.error('loanContract is null')
//       return
//     }
//     const priorityFee = await callRpc('eth_maxPriorityFeePerGas')
//     return loanContract
//       .borrowAmount(actorid, dealid, loanPeriod, {
//         maxPriorityFeePerGas: priorityFee
//       })
//       .then((response: any) => {
//         console.log(response)
//       })
//       .catch((error: Error) => {
//         console.debug('Failed to approve token', error)
//         throw error
//       })
//   }, [])

//   return borrowCallback
// }

// export function useLenderDataCallback(lenderAddress?: any, sharePercent?: any): () => Promise<void> {
//   const { account } = useActiveWeb3React()
//   const loanContract = useLoanContract()

//   const lenderDataCallback = useCallback(async (): Promise<void> => {
//     if (!loanContract) {
//       console.error('loanContract is null')
//       return
//     }
//     loanContract
//       .getLenderData(lenderAddress, sharePercent, {})
//       .then((response: any) => {
//         console.log(response)
//         return response
//       })
//       .catch((error: Error) => {
//         console.debug('Failed to approve token', error)
//         throw error
//       })
//   }, [])

//   return lenderDataCallback
// }

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
