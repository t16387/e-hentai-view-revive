import ColorChip from '@/components/ColorChip'
import Link from '@/components/Link'
import LoadMedia from '@/components/LoadMedia'
import SelectTypography from '@/components/SelectTypography'
import useComicReadPageHistory from '@/hooks/useComicReadPageHistory'
import { IndexListItemPorps, tagListItemProps } from '@/interface/gallery'
import { useIsmobile } from '@/theme'
import {
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Hidden,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PageviewIcon from '@mui/icons-material/PageviewOutlined'
import { Skeleton } from '@mui/material'
import clsx from 'clsx'
import { isNil } from 'lodash-es'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { searchHref, uploaderTerm } from '@/utils/search'
import React, { useState } from 'react'
import FavIconButton from './FavIconButton'
import InfoCard from './InfoCard'
import TagList from './TagList'
import TorrentIconButton from './TorrentIconButton'
import DownloadIconButton from './DownloadIconButton'
import MenuBookIcon from '@mui/icons-material/MenuBook'

/** reader route for a gallery, resuming at the saved page when there is one */
export function readHref(
  info: Pick<IndexListItemPorps, 'gid' | 'token'>,
  latestReadPage?: number
): [string, string] {
  const resume = isNil(latestReadPage) ? '' : `?current=${latestReadPage}`
  return [
    `/[gid]/[token]/read${resume}`,
    `/${info.gid}/${info.token}/read${resume}`,
  ]
}

/** "Read" / "Read 12p" button, shared by the desktop and mobile layouts */
export const ReadButton: React.FC<{
  info: IndexListItemPorps
  className?: string
  startIcon?: React.ReactNode
}> = ({ info, className, startIcon }) => {
  const router = useRouter()
  const [t] = useTranslation()
  const [comicReadPageHistory] = useComicReadPageHistory()
  const latestReadPage = comicReadPageHistory[`/${info.gid}/${info.token}/read`]
  return (
    <Button
      disableElevation
      color="primary"
      variant="contained"
      className={className}
      startIcon={startIcon}
      data-read-button
      onClick={() => {
        const [href, as] = readHref(info, latestReadPage)
        router.push(href, as)
      }}
    >
      {`${t('Read')}${isNil(latestReadPage) ? '' : ` ${latestReadPage + 1}p`}`}
    </Button>
  )
}
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
    },
    details: {
      display: 'flex',
      flexDirection: 'column',
      flex: '1',
      minWidth: 0,
    },

    cover: {
      margin: theme.spacing(0, 'auto'),
      maxHeight: 320,
    },
    center: {
      display: 'flex',
      alignItems: 'center',
    },
    divider: { margin: theme.spacing(1, 0) },

    border: {
      overflow: 'auto',
      borderStyle: 'solid',
      borderColor: theme.palette.divider,
      borderWidth: '0 1px',
      [theme.breakpoints.down('sm')]: {
        borderWidth: '1px 0',
      },
    },

    infoContainer: {
      [theme.breakpoints.down('sm')]: {
        display: 'block',
      },
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: 'calc(100vh - 93px)',
      '& > * + *': {
        marginTop: theme.spacing(1),
      },
    },
    smTitle: {
      [theme.breakpoints.down('sm')]: {
        display: 'flex',
        '& *': {
          textAlign: 'left !important',
        },
      },
    },
    smallCover: {
      width: 103,
      height: 150,
      marginRight: theme.spacing(2),
      flexShrink: 0,
    },
    actions: {
      [theme.breakpoints.up('sm')]: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      },
    },
    readBtn: {
      whiteSpace: 'nowrap',
      marginBottom: theme.spacing(1),
    },
  })
)

interface InfoProps {
  info: IndexListItemPorps
  tagList: tagListItemProps[]
}

const Info: React.FC<InfoProps> = ({ info, tagList }) => {
  const classes = useStyles()
  const [t] = useTranslation()
  return (
    <Card className={classes.root}>
      <Hidden mdDown>
        {info.thumb ? (
          <div className={classes.center}>
            <LoadMedia className={clsx(classes.cover)} src={info.thumb} />
          </div>
        ) : (
          <Skeleton
            variant="rectangular"
            animation="wave"
            width={240}
            height={320}
          />
        )}
      </Hidden>
      <CardContent className={classes.details}>
        <div className={classes.smTitle}>
          <Hidden smUp>
            <LoadMedia className={clsx(classes.smallCover)} src={info.thumb} />
          </Hidden>
          <div>
            <SelectTypography variant="subtitle1" gutterBottom align="center">
              {info.title_jpn}
            </SelectTypography>
            <Hidden smUp>
              <Link
                color="inherit"
                href={searchHref(uploaderTerm(info.uploader), '/')}
              >
                <Typography
                  gutterBottom
                  variant="subtitle2"
                  color="textSecondary"
                >
                  {info.uploader}
                </Typography>
              </Link>
              <ColorChip label={info.category} />
            </Hidden>
          </div>

          <Hidden smDown>
            <SelectTypography variant="subtitle2" gutterBottom align="center">
              {info.title}
            </SelectTypography>
          </Hidden>
        </div>
        <Divider variant="fullWidth" className={classes.divider} />
        <Grid container spacing={2} className={classes.infoContainer}>
          <Grid item>
            <InfoCard record={info} />
          </Grid>
          <Grid item xs className={classes.border} zeroMinWidth>
            <TagList tagList={tagList} />
          </Grid>
          <Grid item className={classes.actions}>
            <ReadButton
              info={info}
              className={classes.readBtn}
              startIcon={<MenuBookIcon />}
            />
            <TorrentIconButton info={info} />
            <DownloadIconButton info={info} />
            <FavIconButton info={info} />
            <Tooltip title={t('OpenEH') as string}>
              <a href={info.url} target="_blank" rel="noreferrer">
                <IconButton color="primary" size="large">
                  <OpenInNewIcon />
                </IconButton>
              </a>
            </Tooltip>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

const useStylesMobile = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      paddingBottom: 6,
    },
    smallCover: {
      width: 120,
      height: 120 * 1.4,
      marginRight: theme.spacing(2),
      flexShrink: 0,
    },
    title: {
      display: '-webkit-box',
      lineClamp: 2,
      WebkitLineClamp: 2,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      WebkitBoxOrient: 'vertical',
    },
    btn: {
      borderRadius: 18,
      padding: theme.spacing(0.75, 4),
      backgroundColor: alpha(theme.palette.primary.main, 0.8),
    },
    oneline: {
      position: 'relative',
      height: 48,
      marginBottom: -6,
    },
    more: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    divider: {
      margin: theme.spacing(1, 0),
    },
  })
)

const MobileInfo: React.FC<InfoProps> = ({ info, tagList }) => {
  const classes = useStylesMobile()
  const router = useRouter()
  const [t] = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSimilar = () => {
    // filter [] () 【】 info
    const re = /(\([^()]*\))|(\[[^\[\]]*\])|(【[^【】]*】)/g
    const f_search = info.title.replace(re, '').trim()
    router.push(searchHref(f_search))
  }

  return (
    <>
      <div className={classes.root}>
        <LoadMedia src={info.thumb} className={classes.smallCover} />
        <Grid container direction="column">
          <SelectTypography
            variant="subtitle1"
            align="left"
            className={classes.title}
          >
            {info.title_jpn}
          </SelectTypography>
          <Link
            color="inherit"
            href={searchHref(uploaderTerm(info.uploader), '/')}
          >
            <Typography gutterBottom variant="subtitle2" color="textSecondary">
              {info.uploader}
            </Typography>
          </Link>
          <Grid item>
            <ColorChip label={info.category} />
          </Grid>
          <Grid item xs />
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            className={classes.oneline}
          >
            <Grid item>
              <ReadButton info={info} className={classes.btn} />
            </Grid>
            <Grid item>
              <IconButton
                onClick={handleClick}
                aria-controls="action-menu"
                aria-haspopup="true"
                size="large"
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                id="action-menu"
                open={Boolean(anchorEl)}
                keepMounted
                onClose={handleClose}
              >
                <FavIconButton info={info} inMenu onClick={handleClose} />
                <DownloadIconButton info={info} inMenu onClick={handleClose} />
                <MenuItem onClick={handleSimilar}>
                  <ListItemIcon color="primary">
                    <PageviewIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('Similar') as string} />
                </MenuItem>
                <a href={info.url} target="_blank" rel="noreferrer">
                  <MenuItem onClick={handleClose}>
                    <ListItemIcon color="primary">
                      <OpenInNewIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('OpenEH') as string} />
                  </MenuItem>
                </a>
              </Menu>
            </Grid>
          </Grid>
        </Grid>
      </div>
      {/* <Divider className={classes.divider} /> */}
      <InfoCard record={info} />
      <Divider className={classes.divider} />
      <div style={{ overflow: 'auto' }}>
        <TagList tagList={tagList} />
      </div>
      <Divider className={classes.divider} />
    </>
  )
}

const InfoWrap = (props: InfoProps) => {
  const matches = useIsmobile()
  if (matches) {
    return <MobileInfo {...props} />
  } else {
    return <Info {...props} />
  }
}
export default InfoWrap
