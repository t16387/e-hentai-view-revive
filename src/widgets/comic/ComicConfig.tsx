import React, { createContext, useCallback, useContext, useMemo } from 'react'
import useEnhanceLocalStorageState from '@/hooks/useEnhanceLocalStorageState'
import { LOCAL_COMIC_CONFIG } from '@/constant'
import {
  DEFAULT_VERTICAL_MAX_HEIGHT_VH,
  DEFAULT_VERTICAL_MAX_WIDTH,
  DEFAULT_VERTICAL_WIDTH_PERCENT,
} from './verticalSize'

export interface ComicConfigProps {
  /**
   * comic direction
   */
  direction?: 'ltr' | 'rtl' | 'vertical'
  /**
   * horizontal mode image fit width/height
   */
  imgFit?: boolean
  /**
   * load full images straight from the H@H server (signed URLs, no cookies
   * needed); falls back to the server's image proxy on failure
   */
  imgDirect?: boolean
  /**
   * Vertical mode: max content column width in px (default 1280).
   * Effective width = min(viewport * verticalWidthPercent/100, this).
   */
  verticalMaxWidth?: number
  /**
   * Vertical mode: width as % of the viewport (50–100, default 100).
   */
  verticalWidthPercent?: number
  /**
   * Vertical mode: max height per page as % of viewport height.
   * 0 = unlimited / natural aspect height (default).
   */
  verticalMaxHeightVh?: number
}

const defualtComicConfig: ComicConfigProps = {
  direction: 'vertical',
  imgFit: true,
  imgDirect: true,
  verticalMaxWidth: DEFAULT_VERTICAL_MAX_WIDTH,
  verticalWidthPercent: DEFAULT_VERTICAL_WIDTH_PERCENT,
  verticalMaxHeightVh: DEFAULT_VERTICAL_MAX_HEIGHT_VH,
}

type SetComicConfig = (
  value:
    | ComicConfigProps
    | ((previousState: ComicConfigProps) => ComicConfigProps)
) => void

const ComicConfigContext = createContext<[ComicConfigProps, SetComicConfig]>([
  defualtComicConfig,
  () => {},
])

function mergeComicConfig(
  raw: ComicConfigProps | null | undefined
): ComicConfigProps {
  return { ...defualtComicConfig, ...(raw || {}) }
}

const ComicConfig: React.FC = ({ children }) => {
  const [raw, setRaw] = useEnhanceLocalStorageState<ComicConfigProps>(
    LOCAL_COMIC_CONFIG,
    defualtComicConfig
  )

  const config = useMemo(() => mergeComicConfig(raw), [raw])

  const setConfig = useCallback<SetComicConfig>(
    (value) => {
      setRaw((prev) => {
        const base = mergeComicConfig(prev)
        const next = typeof value === 'function' ? value(base) : value
        return mergeComicConfig(next)
      })
    },
    [setRaw]
  )

  return (
    <ComicConfigContext.Provider value={[config, setConfig]}>
      {children}
    </ComicConfigContext.Provider>
  )
}

export default ComicConfig

export function useComicConfigState() {
  return useContext(ComicConfigContext)
}

export { defualtComicConfig, mergeComicConfig }
