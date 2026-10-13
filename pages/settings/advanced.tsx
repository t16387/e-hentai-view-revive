import Layout from '@/components/Layout'
import Language from '@/widgets/setting/Language'
import TagShow from '@/widgets/setting/TagShow'
import ThemeMode from '@/widgets/setting/ThemeMode'
import UiTheme from '@/widgets/setting/UiTheme'
import DoNotStoreHistory from '@/widgets/setting/DoNotStoreHistory'
import ShowDownloadsNav from '@/widgets/setting/ShowDownloadsNav'
import ClearCache from '@/widgets/setting/ClearCache'
import ClearDownloads from '@/widgets/setting/ClearDownloads'
import { useIsmobile } from '@/theme'
import { List } from '@mui/material'
import { NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import React from 'react'
import { useRouter } from 'next/router'
const Advanced: NextPage = () => {
  const [t] = useTranslation()
  const matches = useIsmobile()
  const router = useRouter()
  return (
    <Layout
      title={t('Advanced')}
      showBack={{ pathname: '/settings', query: router.query }}
      noContainer={Boolean(matches)}
    >
      <List>
        <Language />
        <ThemeMode />
        <UiTheme />
        <TagShow />
        <DoNotStoreHistory />
        <ShowDownloadsNav />
        <ClearCache />
        <ClearDownloads />
      </List>
    </Layout>
  )
}

export default Advanced

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
