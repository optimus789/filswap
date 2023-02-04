import { Currency, Percent, Price } from '@uniswap/sdk'
import React, { useContext, useEffect, useState } from 'react'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { AutoColumn } from '../../components/Column'
import { AutoRow } from '../../components/Row'
import { ONE_BIPS } from '../../constants'
import { Field } from '../../state/mint/actions'
import { TYPE } from '../../theme'
import CountUp from 'react-countup'
import { formatEther } from '@ethersproject/units'

export function PoolPriceBar({
  loanMode,
  contractData,
  lenderData
}: {
  loanMode?: boolean

  contractData?: any
  lenderData?: any
}) {
  const [poolSize, setPoolSize] = useState(0)
  const [myLent, setMyLent] = useState(0)
  const theme = useContext(ThemeContext)

  // let poolSize,
  //   myLent = 0
  if (contractData) {
    console.log('Contract Data: ', contractData)

    // myLent = parseFloat(formatEther(parseInt(lenderData?.lentAmount).toString()))
    // console.log(
    //   'lenderPool: ',
    //   parseInt(contractData.'0'._hex),
    //   'lentCount: ',
    //   parseInt(contractData.'1'._hex),
    //   'totalInterest Amount: ',
    //   parseInt(contractData.'2'._hex)
    // )
  }

  useEffect(() => {
    if (contractData) {
      console.log('Contract Data: ', contractData)
      setPoolSize(parseFloat(formatEther(parseInt(contractData?.lentAmount).toString())))
      setMyLent(parseFloat(formatEther(parseInt(lenderData?.lentAmount).toString())))
    }
  }, [contractData.data, lenderData.data, lenderData, contractData])

  return (
    <AutoColumn gap="md">
      {loanMode ? (
        <AutoRow justify="space-around" gap="4px">
          <AutoColumn justify="center">
            {/* <TYPE.black>{price?.toSignificant(6) ?? '-'}</TYPE.black> */}
            <CountUp separator="  " decimals={3} decimal="." prefix="TFIL " end={myLent} />
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              Your Lent
            </Text>
          </AutoColumn>
          <AutoColumn justify="center">
            {/* <TYPE.black>{price?.invert()?.toSignificant(6) ?? '-'}</TYPE.black> */}

            <CountUp separator="  " decimals={3} decimal="." prefix="TFIL " end={poolSize} />

            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              Pool Size
              {/* {currencies[Field.CURRENCY_A]?.symbol} per {currencies[Field.CURRENCY_B]?.symbol} */}
            </Text>
          </AutoColumn>
          <AutoColumn justify="center">
            <CountUp separator="  " decimals={2} decimal="." suffix=" %" end={(myLent / poolSize) * 100} />
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              Share of Pool
            </Text>
          </AutoColumn>
        </AutoRow>
      ) : (
        <AutoRow justify="space-around" gap="4px">
          <AutoColumn justify="center">
            {/* <TYPE.black>{price?.toSignificant(6) ?? '-'}</TYPE.black> */}
            <CountUp separator="  " decimals={3} decimal="." prefix="TFIL " end={myLent} />
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              Your Debt
            </Text>
          </AutoColumn>
          <AutoColumn justify="center">
            {/* <TYPE.black>{price?.invert()?.toSignificant(6) ?? '-'}</TYPE.black> */}

            <CountUp separator="  " decimals={3} decimal="." prefix="TFIL " end={poolSize} />

            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              EMI
              {/* {currencies[Field.CURRENCY_A]?.symbol} per {currencies[Field.CURRENCY_B]?.symbol} */}
            </Text>
          </AutoColumn>
          <AutoColumn justify="center">
            <CountUp separator="  " decimals={2} decimal="." suffix=" %" end={(myLent / poolSize) * 100} />
            <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
              Duration
            </Text>
          </AutoColumn>
        </AutoRow>
      )}
    </AutoColumn>
  )
}
