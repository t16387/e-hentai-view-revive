import { useCallback, useEffect, useState } from 'react'
import {
  readShowDownloadsNav,
  writeShowDownloadsNav,
} from '@/utils/downloadPrefs'

/** App setting: show Downloads in nav when true (default). */
export default function useShowDownloadsNav() {
  const [on, setOn] = useState(true)

  useEffect(() => {
    setOn(readShowDownloadsNav())
  }, [])

  const setShowDownloadsNav = useCallback((next: boolean) => {
    writeShowDownloadsNav(next)
    setOn(next)
  }, [])

  return [on, setShowDownloadsNav] as const
}
