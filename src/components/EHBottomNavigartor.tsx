import {
  BottomNavigation,
  BottomNavigationAction,
  Toolbar,
  useMediaQuery,
  useScrollTrigger,
} from '@mui/material'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import FavoriteIcon from '@mui/icons-material/Favorite'
import GetAppIcon from '@mui/icons-material/GetApp'
import HistoryIcon from '@mui/icons-material/History'
import HomeIcon from '@mui/icons-material/Home'
import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import clsx from 'clsx'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { forwardRef } from 'react'
import useShowDownloadsNav from '@/hooks/useShowDownloadsNav'
import SafeArea from './SafeArea'

const BASE_MENU = [
  { title: 'FrontPage', icon: <HomeIcon />, link: '/' },
  { title: 'Watched', icon: <SubscriptionsIcon />, link: '/watched' },
  { title: 'Popular', icon: <WhatshotIcon />, link: '/popular' },
  { title: 'Favorites', icon: <FavoriteIcon />, link: '/favorites' },
  { title: 'Histories', icon: <HistoryIcon />, link: '/histories' },
]

const DOWNLOADS_ITEM = {
  title: 'Downloads',
  icon: <GetAppIcon />,
  link: '/downloads',
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      boxShadow: theme.shadows[2],
      zIndex: theme.zIndex.drawer - 1,
      background: theme.palette.background.paper,
      transition: theme.transitions.create('transform'),
    },
    scrollTrigger: {
      transform: 'translateY(100%)',
    },
    nav: {
      width: '100%',
      overflow: 'hidden',
      // Share width evenly so 5–6 tabs fit ~390px without horizontal clip
      '& .MuiBottomNavigationAction-root': {
        minWidth: 0,
        maxWidth: 'none',
        flex: '1 1 0',
        paddingLeft: 0,
        paddingRight: 0,
      },
      '& .MuiBottomNavigationAction-label': {
        fontSize: '0.625rem',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'clip',
        '&.Mui-selected': {
          fontSize: '0.625rem',
        },
      },
      '& .MuiSvgIcon-root': {
        fontSize: '1.35rem',
      },
    },
    navDense: {
      '& .MuiSvgIcon-root': {
        fontSize: '1.25rem',
      },
      '& .MuiBottomNavigationAction-label': {
        fontSize: '0.55rem',
        '&.Mui-selected': {
          fontSize: '0.55rem',
        },
      },
    },
    navIconOnly: {
      '& .MuiBottomNavigationAction-label': {
        display: 'none',
      },
      '& .MuiSvgIcon-root': {
        fontSize: '1.5rem',
      },
    },
  })
)

const EHBottomNavigartor = forwardRef<HTMLDivElement>((_, ref) => {
  const [t] = useTranslation()
  const router = useRouter()
  const classes = useStyles()
  const trigger = useScrollTrigger()
  const [showDownloads] = useShowDownloadsNav()
  const MENU = showDownloads ? [...BASE_MENU, DOWNLOADS_ITEM] : BASE_MENU
  // ~390px iPhone: 6 labelled tabs overflow; hide labels under 400px when
  // Downloads is on, and always under 360px. Prefer all tabs fully visible.
  const under400 = useMediaQuery('(max-width:400px)')
  const under360 = useMediaQuery('(max-width:360px)')
  const iconOnly =
    under360 || (under400 && MENU.length >= 6) || MENU.length >= 7
  const dense = !iconOnly && MENU.length >= 6
  const index = MENU.findIndex((v) => {
    let pathname = router.pathname
    if (v.link === '/') {
      if (
        pathname === '/' ||
        pathname.startsWith('/?') ||
        pathname === '/index' ||
        pathname.startsWith('/index?')
      )
        return true
    } else {
      if (pathname.startsWith(v.link)) return true
    }
    return false
  })

  // Gallery + Downloads readers use fullscreen ComicList controls — no tab bar
  if (
    index === -1 ||
    router.pathname === '/downloads/[id]/read' ||
    router.pathname === '/[gid]/[token]/read'
  ) {
    return null
  }

  return (
    <footer ref={ref}>
      <SafeArea
        className={clsx(classes.root, { [classes.scrollTrigger]: trigger })}
      >
        <BottomNavigation
          className={clsx(classes.nav, {
            [classes.navDense]: dense,
            [classes.navIconOnly]: iconOnly,
          })}
          showLabels={!iconOnly}
          value={index}
          onChange={(_, index) => {
            router.replace(MENU[index].link)
          }}
        >
          {MENU.map((o, k) => (
            <BottomNavigationAction key={k} label={t(o.title)} icon={o.icon} />
          ))}
        </BottomNavigation>
      </SafeArea>
      <Toolbar />
    </footer>
  )
})

EHBottomNavigartor.displayName = 'EHBottomNavigartor'
export default EHBottomNavigartor
