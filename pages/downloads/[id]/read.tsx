import Layout from '@/components/Layout'
import { DownloadItem, fetchDownload } from '@/apis'
import useComicData from '@/hooks/useComicData'
import { disposeImageLoader } from '@/hooks/useReaderImages'
import useComicReadPageHistory from '@/hooks/useComicReadPageHistory'
import { DEFAULT_ASPECT, resolveStartIndex } from '@/widgets/comic/paging'
import { ComicListDataSourceProps } from '@/widgets/comic/utils'
import { useComicConfigState } from '@/widgets/comic/ComicConfig'
import ComicHorizontalList from '@/widgets/comic/ComicHorizontalList'
import ComicList from '@/widgets/comic/ComicList'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { cache, mutate } from 'swr'

/**
 * Offline Downloads reader — same ComicList / ComicHorizontalList + mode
 * toggle as the online gallery reader. Slots point at local
 * /api/downloads/:id/images/:n URLs (resolved as-is by useReaderImages).
 */
const OfflineRead = () => {
  const router = useRouter()
  const id = router.query.id as string
  const [t] = useTranslation()
  const [config] = useComicConfigState()
  const [history] = useComicReadPageHistory()
  const [item, setItem] = useState<DownloadItem | null>(null)
  const [error, setError] = useState('')
  const [seeded, setSeeded] = useState(false)
  const resolvedFor = useRef<string | null>(null)

  const comicUrl = id ? `/downloads/${id}` : ''
  const comicPagesKey = comicUrl ? `${comicUrl}/read` : ''

  // Subscribe after seed so current index drives URL replaceState
  const { data } = useComicData(comicUrl || '/downloads/_', {
    onlyInitData: true,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchDownload(id)
      .then((res) => {
        if (cancelled) return
        if (res.error || !res.download) {
          setError(res.message || 'not found')
          return
        }
        if (res.download.status !== 'complete') {
          setError(t('Download.NotReady') as string)
          return
        }
        setItem(res.download)
      })
      .catch(() => {
        if (!cancelled) setError('failed')
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  // Seed the shared reader store with every local image slot
  useEffect(() => {
    if (!item || !comicPagesKey || !router.isReady) return
    if (resolvedFor.current === comicPagesKey) return
    const total = item.total || item.filecount || 0
    if (!(total > 0)) {
      setError(t('Download.NotReady') as string)
      return
    }
    resolvedFor.current = comicPagesKey
    const list = Array.from({ length: total }, (_, i) => ({
      index: i,
      thumb: '',
      url: `/api/downloads/${item.id}/images/${i}`,
      aspectratio: DEFAULT_ASPECT,
    }))
    const start = resolveStartIndex({
      query: router.query.current,
      history: history[comicPagesKey],
      total,
    })
    const next: ComicListDataSourceProps = {
      current: start,
      list,
      total,
      perPage: total,
      ready: true,
    }
    if (!cache.has(comicPagesKey)) cache.set(comicPagesKey, next)
    mutate(comicPagesKey, next, false)
    setSeeded(true)
  }, [item, comicPagesKey, router.isReady, router.query.current, history, t])

  useEffect(() => {
    if (!comicPagesKey) return
    return () => disposeImageLoader(comicPagesKey)
  }, [comicPagesKey])

  // History policy matches online read: replaceState only
  const ready = seeded && !!data?.ready && (data?.total || 0) > 0
  const current = data?.current ?? 0
  useEffect(() => {
    if (!ready || !comicUrl || typeof window === 'undefined') return
    const idTimer = setTimeout(() => {
      const qs = `?current=${current}`
      if (window.location.search === qs) return
      const as = `${comicUrl}/read${qs}`
      const url = `/downloads/[id]/read${qs}`
      window.history.replaceState(
        { ...window.history.state, as, url },
        '',
        window.location.pathname + qs
      )
    }, 400)
    return () => clearTimeout(idTimer)
  }, [ready, current, comicUrl])

  if (error) {
    return (
      <Layout title={t('Downloads') as string} showBack="/downloads">
        <Typography align="center" color="error">
          {error}
        </Typography>
      </Layout>
    )
  }

  if (!item || !ready || !comicUrl) {
    return (
      <Layout title={t('Loading') as string} showBack="/downloads" fullScreen>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Layout>
    )
  }

  return (
    <>
      <style jsx global>{`
        * {
          user-select: none;
        }
      `}</style>
      {config.direction === 'vertical' ? (
        <ComicList comicUrl={comicUrl} />
      ) : (
        <ComicHorizontalList comicUrl={comicUrl} />
      )}
    </>
  )
}

export default OfflineRead

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
