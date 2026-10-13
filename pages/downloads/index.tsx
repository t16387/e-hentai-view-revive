import Layout from '@/components/Layout'
import LinearProgressWithLabel from '@/components/LinearProgressWithLabel'
import LoadMedia from '@/components/LoadMedia'
import message from '@/components/message'
import { DownloadItem, deleteDownload, fetchDownloads } from '@/apis'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Typography,
} from '@mui/material'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'

const DownloadsPage = () => {
  const [t] = useTranslation()
  const [list, setList] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetchDownloads()
      if (!res.error) setList(res.list || [])
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [refresh])

  const remove = async (id: string) => {
    try {
      await deleteDownload(id)
      message.success(t('Download.Removed'))
      refresh()
    } catch (e) {
      message.error(t('Download.RemoveFailed'))
    }
  }

  return (
    <Layout title={t('Downloads')} showAvatar showSearch>
      <Box mb={2}>
        {loading && list.length === 0 && (
          <Typography variant="subtitle2" align="center" gutterBottom>
            {t('Loading')}
          </Typography>
        )}
        {!loading && list.length === 0 && (
          <Typography variant="subtitle2" align="center" gutterBottom>
            {t('Download.Empty')}
          </Typography>
        )}
        <Grid container spacing={2}>
          {list.map((item) => {
            const pct =
              item.total > 0
                ? Math.round((item.done / item.total) * 100)
                : item.status === 'complete'
                ? 100
                : 0
            const title = item.title_jpn || item.title || item.id
            return (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" sx={{ gap: 1 }}>
                      {item.thumb ? (
                        <LoadMedia
                          src={item.thumb}
                          style={{
                            width: 72,
                            height: 100,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <Box flex={1} minWidth={0}>
                        <Typography variant="subtitle2" noWrap title={title}>
                          {title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {t(`Download.Status.${item.status}`)}
                          {item.total ? ` · ${item.done}/${item.total}` : ''}
                        </Typography>
                        {(item.status === 'running' ||
                          item.status === 'queued') && (
                          <LinearProgressWithLabel
                            variant="determinate"
                            value={pct}
                          />
                        )}
                        {item.status === 'error' && item.error && (
                          <Typography
                            variant="caption"
                            color="error"
                            component="div"
                          >
                            {item.error}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    {item.status === 'complete' && (
                      <>
                        <Link href={`/downloads/${item.id}/read`} passHref>
                          <Button size="small" color="primary">
                            {t('Read')}
                          </Button>
                        </Link>
                        {item.hasZip && (
                          <Button
                            size="small"
                            href={`/api/downloads/${item.id}/zip`}
                          >
                            {t('Download.SaveLocal')}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      size="small"
                      color="secondary"
                      onClick={() => remove(item.id)}
                    >
                      {t('Download.Remove')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Layout>
  )
}

export default DownloadsPage

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
