import Layout from '@/components/Layout'
import Loading from '@/components/Loading'
import useComicData from '@/hooks/useComicData'
import { disposeImageLoader } from '@/hooks/useReaderImages'
import useComicReadPageHistory from '@/hooks/useComicReadPageHistory'
import { resolveStartIndex } from '@/widgets/comic/paging'
import { ComicListDataSourceProps } from '@/widgets/comic/utils'
import { useComicConfigState } from '@/widgets/comic/ComicConfig'
import ComicHorizontalList from '@/widgets/comic/ComicHorizontalList'
import ComicList from '@/widgets/comic/ComicList'
import { NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { mutate } from 'swr'
const Read: NextPage = () => {
  const router = useRouter()
  const gid = router.query.gid as string
  const token = router.query.token as string
  const comicUrl = `/${gid}/${token}`
  const comicPagesKey = `${comicUrl}/read`
  const [config] = useComicConfigState()
  const [t] = useTranslation()
  const [history] = useComicReadPageHistory()

  const { data } = useComicData(comicUrl, { onlyInitData: true })

  // leaving the reader cancels every pending image request of the gallery
  useEffect(() => () => disposeImageLoader(comicPagesKey), [comicPagesKey])

  // Resolve the start index ONCE per visit (?current= -> saved position -> 0)
  // and put it in the shared store. Reading-mode switches only remount the
  // list component, which then starts from store.current; the URL is never
  // read again, so a stale ?current= cannot win any more.
  const [ready, setReady] = useState(false)
  const resolvedFor = useRef<string | null>(null)
  const total = data?.total || 0
  const queryCurrent = router.query.current
  useEffect(() => {
    if (!router.isReady || total === 0) return
    if (resolvedFor.current === comicPagesKey) return
    resolvedFor.current = comicPagesKey
    const start = resolveStartIndex({
      query: queryCurrent,
      history: history[comicPagesKey],
      total,
    })
    mutate(
      comicPagesKey,
      (old: ComicListDataSourceProps) => ({
        ...old,
        current: start,
        ready: true,
      }),
      false
    )
    setReady(true)
  }, [router.isReady, queryCurrent, total, comicPagesKey, history])

  // History policy (UAT): entering the reader is one router.push from the
  // gallery, so Browser Back returns there in a single step. The page
  // counter only updates the URL via history.replaceState (not
  // router.push / router.replace), so flipping pages never stacks entries
  // that Back would have to walk through.
  const current = data?.current ?? 0
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return
    const id = setTimeout(() => {
      const qs = `?current=${current}`
      if (window.location.search === qs) return
      const as = `${comicUrl}/read${qs}`
      const url = `/[gid]/[token]/read${qs}`
      window.history.replaceState(
        { ...window.history.state, as, url },
        '',
        window.location.pathname + qs
      )
    }, 400)
    return () => clearTimeout(id)
  }, [ready, current, comicUrl])

  if (!data || data.total === 0 || !ready) {
    return (
      <Layout title={t('Loading') + '...'} fullScreen showBack>
        <Loading />
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

export default Read
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}
