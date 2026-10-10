import { useCallback, useEffect, useState } from 'react'
import {
  readDoNotStoreHistory,
  writeDoNotStoreHistory,
} from '@/utils/historyPrefs'

/** App setting: skip writing browse/read history when true. */
export default function useDoNotStoreHistory() {
  const [on, setOn] = useState(false)

  useEffect(() => {
    setOn(readDoNotStoreHistory())
  }, [])

  const setDoNotStoreHistory = useCallback((next: boolean) => {
    writeDoNotStoreHistory(next)
    setOn(next)
  }, [])

  return [on, setDoNotStoreHistory] as const
}
