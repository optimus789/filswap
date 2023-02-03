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
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'

export function PoolPriceBar({
  currencies,
  noLiquidity,
  poolTokenPercentage,
  price,
  contractData,
  lenderData
}: {
  currencies: { [field in Field]?: Currency }
  noLiquidity?: boolean
  poolTokenPercentage?: Percent
  price?: Price
  contractData?: any
  lenderData?: any
}) {
  const [poolSize, setPoolSize] = useState(0)
  const [myLent, setMyLent] = useState(0)
  const [poolShare, setPoolShare] = useState(0)
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
      setPoolShare((myLent / poolSize) * 100 || 0)
    }
  }, [contractData.data, lenderData.data])

  return (
    <AutoColumn gap="md">
      <AutoRow justify="space-around" gap="4px">
        <AutoColumn justify="center">
          {/* <TYPE.black>{price?.toSignificant(6) ?? '-'}</TYPE.black> */}
          <CountUp separator="  " decimals={3} decimal="." prefix="TFIL" end={myLent} />
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            Your Lent
          </Text>
        </AutoColumn>
        <AutoColumn justify="center">
          {/* <TYPE.black>{price?.invert()?.toSignificant(6) ?? '-'}</TYPE.black> */}

          <CountUp separator="  " decimals={3} decimal="." prefix="TFIL" end={poolSize} />

          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            Pool Size
            {/* {currencies[Field.CURRENCY_A]?.symbol} per {currencies[Field.CURRENCY_B]?.symbol} */}
          </Text>
        </AutoColumn>
        <AutoColumn justify="center">
          <TYPE.black>
            {noLiquidity && price
              ? '100'
              : (poolTokenPercentage?.lessThan(ONE_BIPS) ? '<0.01' : poolTokenPercentage?.toFixed(2)) ?? '0'}
            %
          </TYPE.black>

          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            Share of Pool
          </Text>
        </AutoColumn>
      </AutoRow>
    </AutoColumn>
  )
}
