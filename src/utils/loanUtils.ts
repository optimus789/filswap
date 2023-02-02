import { useActiveWeb3React } from 'hooks'
import { BigNumber } from '@ethersproject/bignumber'
import { useLoanContract } from '../hooks/useContract' //'./useContract'

export const callRpc = async (method: any, params?: any) => {
  const options: any = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1
    })
  }
  const res: any = await fetch('https://api.hyperspace.node.glif.io/rpc/v1', options)
  const newData = await res.json()
  return newData?.result
}

export const LendTokens = async (tokenToSend?: any): Promise<void> => {
  const loanContract = useLoanContract(true)
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
}

export const borrowToken = async (tokenToSend?: any): Promise<void> => {
  const loanContract = useLoanContract(true)
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
}

export const getBorrowerData = async (tokenToSend?: any): Promise<void> => {
  const loanContract = useLoanContract(true)
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
}

export const getLenderData = async (tokenToSend?: any): Promise<void> => {
  const loanContract = useLoanContract(true)
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
}
