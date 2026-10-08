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

SwiperCore.use([Controller, Virtual])

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      maxWidth: 1280,
      backgroundColor: theme.palette.background.default,
      margin: theme.spacing(0, 'auto'),
      position: 'relative',
      userSelect: 'none',
    },
    imgContainer: {
      display: 'flex',
      alignItems: 'center',
      minHeight: '100vh',
    },
    imgFitContainer: {
      display: 'flex',
      alignItems: 'center',
      height: '100vh',
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

  const handleSliderChange = (s: SwiperCore) => {
    setComicCurrent(comicPagesKey, s.activeIndex)
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
      <div onClick={() => toggleContorls$.emit()}>
        <Swiper
          key={config.direction}
          dir={config.direction}
          initialSlide={initialSlide}
          onSlideChange={handleSliderChange}
          onSwiper={setSwiper}
          virtual={{ addSlidesBefore: 1, addSlidesAfter: 2 }}
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
