import { EVENT_JUMP_PAGE, EVENT_TOGGLE_CONTROLS } from '@/constant'
import useComicData, { setComicCurrent } from '@/hooks/useComicData'
import useEventManager from '@/hooks/useEventListenerEnhance'
import { useReaderImageQueue } from '@/hooks/useReaderImages'
import { useComicConfigState } from './ComicConfig'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { useEventListener } from 'ahooks'
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import ComicControls from './ComicControls'
import ComicItem from './ComicItem'
import ComicStatus from './ComicStatus'
import { indexAtScroll, prefixOffsets, visibleRange } from './paging'
import { readerWidth } from './utils'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      maxWidth: 1280,
      backgroundColor: 'black',
      minHeight: '100vh',
      position: 'relative',
      margin: theme.spacing(0, 'auto'),
      userSelect: 'none',
    },
    virtualItem: {
      position: 'absolute',
      width: '100%',
      maxWidth: 1280,
    },
  })
)

const scroller = () => document.scrollingElement as HTMLElement

const ComicList: React.FC<{ comicUrl: string }> = ({ comicUrl }) => {
  const comicPagesKey = `${comicUrl}/read`
  const classes = useStyles()
  const { data } = useComicData(comicUrl)
  const [config] = useComicConfigState()
  // must come after useComicData: its page-request emits need the
  // subscription that useComicData sets up
  useReaderImageQueue(comicPagesKey, data, {
    direct: config.imgDirect !== false,
  })
  const list = data?.list
  const offsets = useMemo(
    () => prefixOffsets(list || [], readerWidth()),
    [list]
  )
  const offsetsRef = useRef(offsets)
  offsetsRef.current = offsets
  const currentRef = useRef(data?.current || 0)
  currentRef.current = data?.current || 0

  const jumpPage$ = useEventManager(EVENT_JUMP_PAGE)
  const toggleControls$ = useEventManager(EVENT_TOGGLE_CONTROLS)

  // start where the shared index is (survives switching from ltr/rtl)
  const anchor = useRef<{ index: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const index = currentRef.current
    scroller().scrollTop = offsetsRef.current[index] || 0
    anchor.current = { index, top: offsetsRef.current[index] || 0 }
  }, [])

  // keep the current image in place when items above it change height
  // (thumbnail pages arriving, images reporting their real size)
  useLayoutEffect(() => {
    const a = anchor.current
    if (!a) return
    const top = offsets[a.index] || 0
    if (top !== a.top) {
      scroller().scrollTop += top - a.top
      a.top = top
    }
  }, [offsets])

  useEffect(() => {
    return jumpPage$.subscribe((pageIndex: number) => {
      const top = offsetsRef.current[pageIndex] || 0
      anchor.current = { index: pageIndex, top }
      scroller().scrollTop = top
      setComicCurrent(comicPagesKey, pageIndex)
    })
  }, [comicPagesKey, jumpPage$])

  useEventListener('scroll', () => {
    const el = scroller()
    if (!el) return
    const current = indexAtScroll(
      offsetsRef.current,
      el.scrollTop,
      window.innerHeight
    )
    anchor.current = { index: current, top: offsetsRef.current[current] || 0 }
    if (current !== currentRef.current) setComicCurrent(comicPagesKey, current)
  })

  if (!data || data.total === 0 || !list) return null

  // only mount (and therefore fetch) the images around the current one
  const { start, end } = visibleRange(
    offsets,
    data.current,
    typeof window === 'undefined' ? 800 : window.innerHeight
  )
  const items = []
  for (let k = start; k < end; k++) {
    items.push(
      <div
        key={k}
        className={classes.virtualItem}
        style={{ transform: `translateY(${offsets[k]}px)` }}
      >
        <ComicItem
          index={k}
          item={list[k]}
          total={data.total}
          perPage={data.perPage}
          comicPagesKey={comicPagesKey}
        />
      </div>
    )
  }

  return (
    <>
      <div
        className={classes.root}
        onClick={() => toggleControls$.emit()}
        style={{
          minHeight: offsets[offsets.length - 1],
          position: 'relative',
        }}
      >
        {items}
      </div>
      <ComicStatus total={data.total} current={data.current} />
      <ComicControls total={data.total} current={data.current} />
    </>
  )
}

export default ComicList
