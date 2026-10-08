import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React from 'react'
import Layout from '../src/components/Layout'
import GalleryList from '@/components/GalleryList'
import { readQueryString } from '@/utils/search'

const IndexPage = () => {
  const router = useRouter()
  const f_search = readQueryString(router.query.f_search)

  return (
    <Layout showAvatar showSearch>
      {router.isReady && (
        <GalleryList key={f_search} mode="index" f_search={f_search} />
      )}
    </Layout>
  )
}

export default IndexPage

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
