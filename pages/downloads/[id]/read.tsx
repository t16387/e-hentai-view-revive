import Layout from '@/components/Layout'
import { DownloadItem, fetchDownload } from '@/apis'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

const OfflineRead = () => {
  const router = useRouter()
  const id = router.query.id as string
  const [t] = useTranslation()
  const [item, setItem] = useState<DownloadItem | null>(null)
  const [error, setError] = useState('')

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

  const title = item ? item.title_jpn || item.title || item.id : t('Download')

  if (error) {
    return (
      <Layout title={t('Downloads') as string} showBack="/downloads">
        <Typography align="center" color="error">
          {error}
        </Typography>
      </Layout>
    )
  }

  if (!item) {
    return (
      <Layout title={t('Loading') as string} showBack="/downloads">
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Layout>
    )
  }

  const total = item.total || item.filecount || 0

  return (
    <Layout title={title} showBack="/downloads" noContainer>
      <Box maxWidth={1280} mx="auto" px={1}>
        <Typography variant="h6" gutterBottom align="center">
          {title}
        </Typography>
        {Array.from({ length: total }, (_, i) => (
          <Box key={i} mb={1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/downloads/${item.id}/images/${i}`}
              alt={`${i + 1}`}
              style={{ width: '100%', display: 'block' }}
              loading="lazy"
            />
          </Box>
        ))}
      </Box>
    </Layout>
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
