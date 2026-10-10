import SearchFilterBar from '@/components/search/SearchFilterBar'
import Layout from '@/components/Layout'
import GalleryList from '@/components/GalleryList'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { filtersKey, readSearchFilters } from '@/utils/search'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React from 'react'

const Result = () => {
  const router = useRouter()
  const filters = readSearchFilters(router.query)
  const key = filtersKey(filters)
  const title = filters.f_search || filters.language || 'Search'

  return (
    <Layout
      title={title}
      showBack
      tool={
        <>
          <IconButton
            onClick={() => router.push('/search')}
            size="large"
            aria-label="edit search"
          >
            <CloseIcon />
          </IconButton>
        </>
      }
    >
      {router.isReady && (
        <>
          <SearchFilterBar filters={filters} path="/result" />
          <GalleryList key={key || 'result'} mode="index" {...filters} />
        </>
      )}
    </Layout>
  )
}

export default Result

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
