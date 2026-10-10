import { setting } from '@/apis'
import Layout from '@/components/Layout'
import { Button, Typography } from '@mui/material'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import React, { useEffect } from 'react'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    body: {
      padding: theme.spacing(3),
      maxWidth: 560,
      margin: '0 auto',
    },
    actions: {
      marginTop: theme.spacing(2),
    },
  })
)

const EHConfig: NextPage<{ configURL: string }> = ({ configURL }) => {
  const [t] = useTranslation()
  const classes = useStyles()
  // refresh app cookies from upstream when visiting settings (read-only for us)
  useEffect(() => {
    setting()
  }, [])
  return (
    <Layout title={t('EH.EhentaiSetting')} showBack>
      <div className={classes.body}>
        <Typography paragraph>{t('EH.IframeUnavailable')}</Typography>
        <div className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            href={configURL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNewIcon />}
          >
            {t('EH.OpenExternal')}
          </Button>
        </div>
        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginTop: 16, wordBreak: 'break-all' }}
        >
          {configURL}
        </Typography>
      </div>
    </Layout>
  )
}

export default EHConfig

export async function getServerSideProps({ locale }: { locale: string }) {
  const { configURL } = require('../../server/src/config/api')
  return {
    props: {
      configURL,
      ...(await serverSideTranslations(locale)),
    },
  }
}
