import SearchFilterBar from '@/components/search/SearchFilterBar'
import Layout from '@/components/Layout'
import GalleryList from '@/components/GalleryList'
import { filtersKey, readSearchFilters } from '@/utils/search'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React from 'react'

const IndexPage = () => {
  const router = useRouter()
  const filters = readSearchFilters(router.query)
  const key = filtersKey(filters)

  return (
    <Layout showAvatar showSearch>
      {router.isReady && (
        <>
          <SearchFilterBar filters={filters} path="/" />
          <GalleryList key={key || 'home'} mode="index" {...filters} />
        </>
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
