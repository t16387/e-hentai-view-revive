import Layout from '@/components/Layout'
import GalleryList from '@/components/GalleryList'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React from 'react'
import { readQueryString } from '@/utils/search'

const Result = () => {
  const router = useRouter()

  const f_search = readQueryString(router.query.f_search)

  return (
    <Layout
      title={f_search}
      showBack
      tool={
        <>
          <IconButton onClick={() => router.push('/search')} size="large">
            <CloseIcon />
          </IconButton>
          {/* <IconButton edge="end">
            <TuneIcon />
          </IconButton> */}
        </>
      }
    >
      {/* wait for the query on statically optimised pages instead of
          searching for "undefined" */}
      {router.isReady && (
        <GalleryList key={f_search} mode="index" f_search={f_search} />
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
