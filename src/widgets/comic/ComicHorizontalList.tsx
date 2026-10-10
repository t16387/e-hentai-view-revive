import Loading from '@/components/Loading'
import { EVENT_JUMP_PAGE, EVENT_TOGGLE_CONTROLS } from '@/constant'
import useComicData, { setComicCurrent } from '@/hooks/useComicData'
import useEventManager from '@/hooks/useEventListenerEnhance'
import { useReaderImageQueue } from '@/hooks/useReaderImages'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import SwiperCore, { Controller, Virtual } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/swiper-bundle.min.css'
import { useComicConfigState } from './ComicConfig'
import ComicControls from './ComicControls'
import ComicItem from './ComicItem'
import ComicStatus from './ComicStatus'
import { clampIndex, horizontalStep, tapZone } from './paging'

SwiperCore.use([Controller, Virtual])

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      maxWidth: 1280,
      width: '100%',
      minHeight: '100vh',
      height: '100%',
      backgroundColor: theme.palette.background.default,
      margin: theme.spacing(0, 'auto'),
      position: 'relative',
      userSelect: 'none',
      // Swiper needs a definite box so a phone-width resize (e.g. 390px)
      // reflows slides instead of keeping a stale wider track
      '& .swiper-container, & .swiper': {
        width: '100%',
        height: '100%',
      },
    },
    imgContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
    },
    imgFitContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100%',
      '& img': {
        width: 'auto',
        maxWidth: '100%',
        minHeight: 'unset !important',
        maxHeight: '100vh',
        display: 'block',
        margin: '0 auto',
      },
    },
  })
)

const ComicHorizontalList: React.FC<{
  comicUrl: string
}> = ({ comicUrl }) => {
  const comicPagesKey = `${comicUrl}/read`
  const classes = useStyles()
  const { data } = useComicData(comicUrl)
  const toggleContorls$ = useEventManager(EVENT_TOGGLE_CONTROLS)
  const jumpPage$ = useEventManager(EVENT_JUMP_PAGE)

  const [swiper, setSwiper] = useState<SwiperCore | null>(null)

  const [config] = useComicConfigState()
  // after useComicData (page-request subscription), see ComicList
  useReaderImageQueue(comicPagesKey, data, {
    direct: config.imgDirect !== false,
  })
  const dataRef = useRef(data)
  dataRef.current = data
  const swiperRef = useRef(swiper)
  swiperRef.current = swiper
  // reader direction for keyboard / tap zones (never 'vertical' here)
  const dir = config.direction === 'rtl' ? 'rtl' : 'ltr'
  const dirRef = useRef<'ltr' | 'rtl'>(dir)
  dirRef.current = dir

  // Start slide for each Swiper instance. The Swiper is remounted on every
  // direction change (key), so take the shared index at that moment rather
  // than a prop captured when the page first opened.
  const initialSlide = useMemo(
    () => dataRef.current?.current || 0,
    [config.direction] // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    if (!swiper) return
    const target = dataRef.current?.current || 0
    if (swiper.activeIndex !== target) swiper.slideTo(target, 0)
    // always listen for jumps (slider), whatever the entry point was;
    // previously the subscription was skipped when ?current= was missing
    return jumpPage$.subscribe((pageIndex: number) => {
      swiper.slideTo(pageIndex, 0)
    })
  }, [jumpPage$, swiper])

  // phone chrome / rotation: recompute slide sizes (390px UAT)
  useEffect(() => {
    if (!swiper) return
    const onResize = () => {
      swiper.update()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [swiper])

  // keyboard arrows respect RTL; ignore when a field is focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = swiperRef.current
      const total = dataRef.current?.total || 0
      if (!s || total === 0) return
      e.preventDefault()
      const side = e.key === 'ArrowLeft' ? 'left' : 'right'
      const next = clampIndex(
        (dataRef.current?.current || 0) + horizontalStep(dirRef.current, side),
        total
      )
      s.slideTo(next, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSliderChange = (s: SwiperCore) => {
    setComicCurrent(comicPagesKey, s.activeIndex)
  }

  // tap zones: left/right navigate (RTL-aware), centre toggles chrome.
  // Ignore clicks that followed a swipe so Swiper gestures stay intact.
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (start) {
      const dx = Math.abs(e.clientX - start.x)
      const dy = Math.abs(e.clientY - start.y)
      if (dx > 8 || dy > 8) return // was a swipe / drag
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const zone = tapZone(e.clientX, rect.left, rect.width)
    if (zone === 'center') {
      toggleContorls$.emit()
      return
    }
    const s = swiperRef.current
    const total = dataRef.current?.total || 0
    if (!s || total === 0) return
    const next = clampIndex(
      (dataRef.current?.current || 0) + horizontalStep(dir, zone),
      total
    )
    s.slideTo(next, 0)
  }

  if (!data || data.total === 0)
    return (
      <div
        className={classes.root}
        style={{
          height: '100vh',
        }}
      >
        <Loading />
      </div>
    )
  return (
    <div className={classes.root}>
      <div onPointerDown={onPointerDown} onClick={onClick}>
        <Swiper
          key={config.direction}
          dir={config.direction}
          initialSlide={initialSlide}
          onSlideChange={handleSliderChange}
          onSwiper={setSwiper}
          virtual={{ addSlidesBefore: 1, addSlidesAfter: 2 }}
          observer
          observeSlideChildren
          updateOnWindowResize
          resizeObserver
        >
          {data.list.map((o, k) => (
            <SwiperSlide key={k} data-hovindex={k}>
              <div
                className={
                  config.imgFit ? classes.imgFitContainer : classes.imgContainer
                }
              >
                <ComicItem
                  index={k}
                  item={o}
                  total={data.total}
                  perPage={data.perPage}
                  comicPagesKey={comicPagesKey}
                  noMinHeight
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <ComicStatus total={data.total} current={data.current} />
      <ComicControls total={data.total} current={data.current} />
    </div>
  )
}

export default ComicHorizontalList
