import Layout from '@/components/Layout'
import message from '@/components/message'
import { LOCAL_HISTORY } from '@/constant'
import useEnhanceLocalStorageState from '@/hooks/useEnhanceLocalStorageState'
import { IndexListItemPorps } from '@/interface/gallery'
import GalleryCard from '@/components/GalleryCard'
import { useStyles } from '@/components/GalleryList'
import { clearWatchHistory } from '@/utils/clearWatchHistory'
import { Box, Button, Grid, Typography } from '@mui/material'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import React from 'react'

const Histories = () => {
  const classes = useStyles()
  const [t] = useTranslation()
  const [data, setData] = useEnhanceLocalStorageState<IndexListItemPorps[]>(
    LOCAL_HISTORY,
    []
  )

  const handleClear = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(t('History.Clear.Confirm') as string)
    ) {
      return
    }
    clearWatchHistory()
    setData([])
    message.success(t('History.Cleared'))
  }

  return (
    <Layout title={t('Histories')} showAvatar showSearch>
      <Box mb={2}>
        {data.length > 0 && (
          <Box mb={2} display="flex" justifyContent="flex-end">
            <Button color="secondary" variant="outlined" onClick={handleClear}>
              {t('History.Clear')}
            </Button>
          </Box>
        )}
        {data.length === 0 && (
          <Typography variant="subtitle2" align="center" gutterBottom>
            {t('Search.NoThisFound')}
          </Typography>
        )}
        <Grid
          container
          wrap="wrap"
          justifyContent="flex-start"
          className={classes.container}
          spacing={2}
        >
          {data.map((o, k) => (
            <Grid item xs key={o.gid} data-index={k}>
              <GalleryCard record={o} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Layout>
  )
}

export default Histories

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
