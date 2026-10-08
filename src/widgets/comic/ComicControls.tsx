import SafeArea from '@/components/SafeArea'
import SlideUpDialog from '@/components/SlideUpDialog'
import { EVENT_JUMP_PAGE, EVENT_TOGGLE_CONTROLS } from '@/constant'
import useEventManager from '@/hooks/useEventListenerEnhance'
import { AppBar, IconButton, Slider, Toolbar, Typography } from '@mui/material'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SettingsIcon from '@mui/icons-material/Settings'
import { useDebounceFn } from 'ahooks'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import ComicSettings from './ComicSettings'
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: { flex: 1 },
    head: {
      top: 0,
    },
    footer: {
      zIndex: theme.zIndex.appBar,
      bottom: 0,
      position: 'fixed',
      left: 0,
      right: 0,
      backgroundColor: theme.palette.background.paper,
      padding: theme.spacing(1, 2),
    },
  })
)
const ComicControls: React.FC<{ total: number; current: number }> = ({
  total,
  current,
}) => {
  const router = useRouter()
  const classes = useStyles()
  const [currentPage, setCurrentPage] = useState(current)
  const [open, setOpen] = useState(false)
  const [openConfig, setOpenConfig] = useState(false)
  const jumpPage$ = useEventManager(EVENT_JUMP_PAGE)
  const toggleContorls$ = useEventManager(EVENT_TOGGLE_CONTROLS)
  useEffect(() => {
    setCurrentPage(current)
  }, [current])

  // the slider only moves the reader; read.tsx keeps ?current= in sync
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  const { run } = useDebounceFn(() => jumpPage$.emit(currentPageRef.current), {
    wait: 300,
  })

  useEffect(() => {
    return toggleContorls$.subscribe(() => setOpen((t) => !t))
  }, [toggleContorls$])

  if (!open) return null

  return (
    <>
      {/* head */}

      <AppBar position="fixed">
        <Toolbar>
          <IconButton edge="start" onClick={() => router.back()} size="large">
            <ArrowBackIcon />
          </IconButton>

          <div className={classes.title}></div>

          <IconButton
            edge="end"
            onClick={() => setOpenConfig(true)}
            size="large"
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* footer */}

      <footer className={classes.footer}>
        <SafeArea>
          <Slider
            max={total - 1}
            value={currentPage}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => v + 1}
            onChange={(_, v) => {
              setCurrentPage(v as number)
              run()
            }}
          />
          <Typography align="center">
            {currentPage + 1}/{total}
          </Typography>
        </SafeArea>
      </footer>

      <SlideUpDialog open={openConfig} onClose={() => setOpenConfig(false)}>
        {/* switching mode needs no index hand-off: the remounted list
            starts from the shared store's current index */}
        <ComicSettings />
      </SlideUpDialog>
    </>
  )
}

export default ComicControls
