import SlideUpDialog from '@/components/SlideUpDialog'
import { commentListItemProps } from '@/interface/gallery'
import { useIsmobile } from '@/theme'
import {
  AppBar,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { forwardRef, useCallback } from 'react'
import { parseGalleryUrl } from '@/utils/search'
import { sanitizeCommentHtml } from '@/utils/sanitizeCommentHtml'

const useStyles = makeStyles(() =>
  createStyles({
    comment: {
      wordBreak: 'break-word',
      breakWord: 'word-break',
    },
    hidden: { maxHeight: 80, overflow: 'hidden' },
  })
)

export interface CommentListProps {
  commentList: commentListItemProps[]
  hidden?: boolean
}

/**
 * Intercept e-hentai / exhentai gallery links in comment HTML and navigate
 * in-app. Event delegation survives dangerouslySetInnerHTML re-renders
 * (unlike one-shot a.onclick in useEffect).
 */
function useGalleryLinkClick() {
  const router = useRouter()
  return useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null
      const a = target?.closest?.('a') as HTMLAnchorElement | null
      if (!a || !a.href) return
      const gallery = parseGalleryUrl(a.href)
      if (!gallery) return
      e.preventDefault()
      e.stopPropagation()
      // Drop showPage=comments (or other overlays) so the SPA does not stay
      // on a stuck dialog / broken router state for the new gallery.
      void router.push(
        {
          pathname: '/[gid]/[token]',
          query: { gid: gallery.gid, token: gallery.token },
        },
        `/${gallery.gid}/${gallery.token}`
      )
    },
    [router]
  )
}

const CommentListContent = forwardRef<HTMLUListElement, CommentListProps>(
  ({ commentList, hidden }, ref) => {
    const classes = useStyles()
    const [t] = useTranslation()
    const onLinkClick = useGalleryLinkClick()
    return (
      <List ref={ref} className="commnets-list" onClick={onLinkClick}>
        {commentList.length === 0 ? (
          <Typography
            gutterBottom
            align="center"
            variant="subtitle1"
            component="p"
          >
            {t('G.noComments')}
          </Typography>
        ) : (
          commentList.map((o, k) => (
            <ListItem
              key={k}
              divider={k !== commentList.length - 1}
              disableGutters={hidden}
            >
              <ListItemText
                primary={
                  <Grid container justifyContent="space-between">
                    <Typography component="span">{o.userName}</Typography>
                    <Typography component="span">
                      {dayjs(o.time).format('YYYY-MM-DD HH:mm')}
                    </Typography>
                  </Grid>
                }
                secondary={
                  <div
                    className={clsx(classes.comment, {
                      [classes.hidden]: hidden,
                    })}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeCommentHtml(
                        `${o.comment}<span> ${o.score}</span>`
                      ),
                    }}
                  />
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          ))
        )}
      </List>
    )
  }
)
CommentListContent.displayName = 'CommentListContent'
const CommentList: React.FC<CommentListProps> = ({ commentList }) => {
  const theme = useTheme()
  const matches = useIsmobile()
  const router = useRouter()
  const showPage = router.query.showPage as string
  const gid = router.query.gid as string
  const token = router.query.token as string
  const [t] = useTranslation()
  return (
    <>
      {commentList.length > 0 && (
        <Grid container alignItems="center" style={{ marginBottom: -10 }}>
          <Grid item xs>
            <Typography variant="subtitle1">{t('G.Comments')}</Typography>
          </Grid>
          <Grid item>
            <IconButton
              onClick={() =>
                router.push(
                  '/[gid]/[token]?showPage=comments',
                  `/${gid}/${token}?showPage=comments`
                )
              }
              size="large"
            >
              <ArrowRightIcon />
            </IconButton>
          </Grid>
        </Grid>
      )}
      <CommentListContent hidden commentList={commentList.slice(0, 2)} />

      <SlideUpDialog
        fullScreen={Boolean(matches)}
        fullWidth={!Boolean(matches)}
        open={showPage === 'comments'}
        onClose={() => router.back()}
        scroll="paper"
      >
        {matches && (
          <AppBar position="sticky">
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => router.back()}
                size="large"
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography style={{ marginLeft: theme.spacing(2) }} variant="h6">
                {t('G.Comments')}
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        {!matches && (
          <DialogTitle style={{ padding: theme.spacing(2, 2, 0) }}>
            {t('G.Comments')}
          </DialogTitle>
        )}

        <CommentListContent commentList={commentList} />
      </SlideUpDialog>
    </>
  )
}
export default CommentList
