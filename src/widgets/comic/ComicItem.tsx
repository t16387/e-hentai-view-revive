import { EVENT_LOAD_MORE_PAGE } from '@/constant'
import useComicItemImage from '@/hooks/useComicItem'
import useEventManager from '@/hooks/useEventListenerEnhance'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import React, { useEffect, useState } from 'react'
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
    img: { width: '100%' },
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

  // The image page URL is derived from props on every render. It used to be
  // useState(url): an item mounted while its slot was still empty kept
  // url=undefined forever, so full images never loaded in vertical mode past
  // the first thumbnail pages. Only the nl= retry key is local state, and it
  // resets when the slot's URL changes.
  const [nl, setNl] = useState<string | null>(null)
  useEffect(() => setNl(null), [url])
  const pageUrl = url ? (nl ? `${url}?nl=${nl}` : url) : null
  const { data } = useComicItemImage(pageUrl)

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
      {data ? (
        <ProxyImg
          src={data.url}
          alt={index.toString()}
          className={classes.img}
          onError={() => {
            if (data.retryURL && nl !== data.retryURL) setNl(data.retryURL)
          }}
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
    </div>
  )
}

export default ComicItem
