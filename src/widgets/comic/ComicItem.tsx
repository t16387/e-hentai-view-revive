import { EVENT_LOAD_MORE_PAGE } from '@/constant'
import { useImageState } from '@/hooks/useReaderImages'
import useEventManager from '@/hooks/useEventListenerEnhance'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import React, { useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { Button } from '@mui/material'
import { mutate } from 'swr'
import { ComicListDataSourceProps } from './utils'
import { ComicSlot, DEFAULT_ASPECT, pagesToLoad } from './paging'
import { verticalItemDims } from './verticalSize'
import ProxyImg from '@/components/ProxyImg'
import Thumb from '@/components/Thumb'

const useStyles = makeStyles<Theme, {}>((theme: Theme) =>
  createStyles({
    root: {
      transition: theme.transitions.create(['height', 'max-width']),
      margin: theme.spacing(0, 'auto'),
      width: '100%',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    img: { width: '100%', display: 'block', height: 'auto' },
    frame: { position: 'relative', width: '100%' },
    reload: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1,
    },
    placeholder: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.typography.h4,
    },
  })
)

const ComicItem: React.FC<{
  index: number
  /** reader slot; undefined until its thumbnail page has been loaded */
  item: ComicSlot
  total: number
  perPage?: number
  comicPagesKey: string
  noMinHeight?: boolean
  /** vertical column width from ComicList (defaults kept for safety) */
  columnWidth?: number
  /** optional per-page max height in px (0 = unlimited) */
  maxHeightPx?: number
}> = ({
  index,
  item,
  total,
  perPage,
  comicPagesKey,
  noMinHeight,
  columnWidth = 1280,
  maxHeightPx = 0,
}) => {
  const classes = useStyles({})
  const url = item?.url
  const aspectratio = item?.aspectratio || DEFAULT_ASPECT

  // Image page -> URL -> preloaded image is handled by the reader's image
  // queue (useReaderImages / imageLoader.ts): bounded concurrency, prefetch
  // in reading direction, nl= retries. The item only renders its state, so
  // its slot URL is always read from the latest props (the old useState(url)
  // bug cannot come back).
  const [t] = useTranslation()
  const [image, loader] = useImageState(comicPagesKey, index)
  const loaded = image.status === 'loaded' && !!image.src

  // ask for the thumbnail page holding this image (and a few ahead)
  const loadMorePage$ = useEventManager(EVENT_LOAD_MORE_PAGE)
  useEffect(() => {
    pagesToLoad(index, perPage || 0, total).forEach((p) =>
      loadMorePage$.emit(p)
    )
  }, [index, perPage, total, loadMorePage$])

  const dims = verticalItemDims(aspectratio, columnWidth, maxHeightPx)
  const minHeight = dims.height

  // remember the real aspect ratio (natural size, not the rendered box)
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (!naturalWidth || !naturalHeight) return
    const ratio = naturalWidth / naturalHeight
    if (Math.abs(ratio - aspectratio) / aspectratio < 0.02) return
    mutate(
      comicPagesKey,
      (old: ComicListDataSourceProps) => {
        const slot = old?.list?.[index]
        if (!slot || slot.url !== url) return old
        const list = old.list.slice()
        list[index] = { ...slot, aspectratio: ratio }
        return { ...old, list }
      },
      false
    )
  }

  const frameStyle: React.CSSProperties =
    maxHeightPx > 0 && dims.width < columnWidth
      ? {
          width: dims.width,
          maxHeight: dims.height,
          marginLeft: 'auto',
          marginRight: 'auto',
        }
      : maxHeightPx > 0
      ? { maxHeight: dims.height }
      : {}

  const imgStyle: React.CSSProperties =
    maxHeightPx > 0
      ? {
          maxHeight: dims.height,
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
        }
      : {}

  return (
    <div
      style={{
        minHeight: noMinHeight ? undefined : minHeight,
        maxWidth: columnWidth,
      }}
      className={classes.root}
      data-index={index}
      // eslint-disable-next-line jsx-a11y/aria-role
      role="comic-item"
    >
      <div className={classes.frame} style={frameStyle}>
        {loaded ? (
          <img
            src={image.src}
            alt={index.toString()}
            className={classes.img}
            style={imgStyle}
            decoding="async"
            referrerPolicy="no-referrer"
            // a preloaded image that still fails (cache evicted, node gone)
            onError={() => loader.reportError(index, image.src)}
            onLoad={handleLoad}
          />
        ) : item?.sprite ? (
          <Thumb src={item.thumb} sprite={item.sprite} maxWidth={dims.width} />
        ) : item?.thumb ? (
          <ProxyImg
            src={item.thumb}
            alt={index.toString()}
            className={classes.img}
            style={imgStyle}
          />
        ) : (
          <div className={classes.placeholder} style={{ minHeight }}>
            {index + 1}
          </div>
        )}
        {image.status === 'failed' && (
          <Button
            data-reload-button
            variant="contained"
            color="primary"
            className={classes.reload}
            onClick={(e) => {
              e.stopPropagation()
              loader.reload(index)
            }}
          >
            {t('TapToReload')}
          </Button>
        )}
      </div>
    </div>
  )
}

export default ComicItem
