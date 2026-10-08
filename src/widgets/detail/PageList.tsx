import { loadMorePage } from '@/apis'
import LoadMedia from '@/components/LoadMedia'
import Thumb from '@/components/Thumb'
import useInViewportWithDistance from '@/hooks/useInViewportWithDistance'
import { DetailThumbPage, PageListProps } from '@/interface/gallery'
import { Button, Card, CardActionArea, Grid, Typography } from '@mui/material'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { Skeleton } from '@mui/material'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { useSWRInfinite } from 'swr'
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    cover: {
      margin: theme.spacing(0, 'auto'),
      maxHeight: 320,
      minHeight: 150,
    },

    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      [theme.breakpoints.down('md')]: {
        gridTemplateColumns: 'repeat(4, 1fr)',
      },
      [theme.breakpoints.down('sm')]: {
        gridTemplateColumns: 'repeat(3, 1fr)',
      },
    },

    speedDial: {
      position: 'fixed',
      right: 16,
      bottom: 16,
      zIndex: theme.zIndex.speedDial - 2,
    },
    btn: { margin: theme.spacing(1, 0) },
  })
)
const PageList: React.FC<Omit<PageListProps, 'filecount'>> = ({
  url,
  initialData,
  thumbPages,
}) => {
  const [inView, ref] = useInViewportWithDistance<HTMLButtonElement>(600)
  const [t] = useTranslation()
  const classes = useStyles()
  const router = useRouter()
  const handleOpen = (k?: number) => {
    // k === 0 (first image) is a valid index
    if (k !== undefined && k !== null)
      router.push(
        '/[gid]/[token]/read?current=' + k,
        url + '/read?current=' + k
      )
    else router.push('/[gid]/[token]/read', url + '/read')
  }

  const pageCount = thumbPages?.pageCount || 1
  const { data, error, size, setSize } = useSWRInfinite<DetailThumbPage>(
    (offset) =>
      offset < pageCount ? [`/api/gallery${url}/${offset}`, offset] : null,
    async (pageUrl: string, offset: number) => {
      // page 0 came with the detail response
      if (offset === 0)
        return { ...thumbPages, list: initialData, page: 0 } as DetailThumbPage
      return await loadMorePage(pageUrl)
    }
  )

  const dataSource = data ? data.flatMap((page) => page.list) : []
  const isLoadingInitialData = !data && !error
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = !isLoadingInitialData && dataSource.length === 0
  const isReachingEnd = isEmpty || (!!data && data.length >= pageCount)

  useEffect(() => {
    if (inView && !isLoadingMore && !isReachingEnd) setSize((t) => t + 1)
  }, [inView, isLoadingMore, isReachingEnd, setSize])

  return (
    <>
      <Grid container className={classes.container} spacing={2}>
        {dataSource.map((o, i) => (
          <Grid item key={o.url} container wrap="nowrap" direction="column">
            <Grid item xs>
              <Card>
                <CardActionArea onClick={() => handleOpen(o.index ?? i)}>
                  {o.sprite ? (
                    <Thumb src={o.thumb} sprite={o.sprite} />
                  ) : (
                    <LoadMedia className={classes.cover} src={o.thumb} />
                  )}
                </CardActionArea>
              </Card>
            </Grid>
            <Typography align="center">{(o.index ?? i) + 1}</Typography>
          </Grid>
        ))}
        {isLoadingMore &&
          new Array(Math.min(thumbPages?.perPage || 20, 20))
            .fill(0)
            .map((_, k) => (
              <Grid item key={k}>
                <Card>
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className={classes.cover}
                    height={150}
                  />
                </Card>
              </Grid>
            ))}
      </Grid>
      <Button
        ref={ref}
        fullWidth
        disabled={isLoadingMore || isReachingEnd}
        className={classes.btn}
      >
        {isReachingEnd
          ? t('ReachEnd')
          : isLoadingMore
          ? t('Loading') + '...'
          : t('More')}
      </Button>
    </>
  )
}

export default PageList
