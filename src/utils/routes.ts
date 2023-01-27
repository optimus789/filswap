export const replaceURLParam = (search: string, param: string, newValue: string) => {
  const searchParams = new URLSearchParams(search)
  searchParams.set(param, newValue)
  searchParams.set('outputCurrency', 'ETH')
  return searchParams.toString()
}
