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
import { ComicListDataSourceProps, computedAspectratioHeight } from './utils'
import { ComicSlot, DEFAULT_ASPECT, pagesToLoad } from './paging'
import ProxyImg from '@/components/ProxyImg'
import Thumb from '@/components/Thumb'

const useStyles = makeStyles<Theme, {}>((theme: Theme) =>
  createStyles({
    root: {
      transition: theme.transitions.create('height'),
      maxWidth: 1280,
      margin: theme.spacing(0, 'auto'),
      width: '100%',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
    },
    img: { width: '100%', display: 'block' },
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
}> = ({ index, item, total, perPage, comicPagesKey, noMinHeight }) => {
  const classes = useStyles()
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

  const minHeight = computedAspectratioHeight(aspectratio)

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

  return (
    <div
      style={{ minHeight: noMinHeight ? '' : minHeight }}
      className={classes.root}
      data-index={index}
      // eslint-disable-next-line jsx-a11y/aria-role
      role="comic-item"
    >
      <div className={classes.frame}>
        {loaded ? (
          <img
            src={image.src}
            alt={index.toString()}
            className={classes.img}
            decoding="async"
            referrerPolicy="no-referrer"
            // a preloaded image that still fails (cache evicted, node gone)
            onError={() => loader.reportError(index, image.src)}
            onLoad={handleLoad}
          />
        ) : item?.sprite ? (
          <Thumb src={item.thumb} sprite={item.sprite} maxWidth={1280} />
        ) : item?.thumb ? (
          <ProxyImg
            src={item.thumb}
            alt={index.toString()}
            className={classes.img}
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
