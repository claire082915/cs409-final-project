import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useFiltersInUrl(params) {
  const [, setSearchParams] = useSearchParams()
  const search = params.toString()
  useEffect(() => {
    // Replace so each keystroke or tick doesn't add a history entry
    setSearchParams(search, { replace: true })
  }, [search])
}
