import Layout from '@/components/Layout'
import Loading from '@/components/Loading'
import useComicData from '@/hooks/useComicData'
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

  // keep ?current= in the address bar in sync (shallow: no data refetch)
  const current = data?.current ?? 0
  useEffect(() => {
    if (!ready) return
    const id = setTimeout(() => {
      if (router.query.current === String(current)) return
      router.replace(
        `/[gid]/[token]/read?current=${current}`,
        `${comicUrl}/read?current=${current}`,
        { shallow: true, scroll: false }
      )
    }, 400)
    return () => clearTimeout(id)
  }, [ready, current, comicUrl]) // eslint-disable-line react-hooks/exhaustive-deps

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
