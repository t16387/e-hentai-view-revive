import { login, UserPayload } from '@/apis'
import message from '@/components/message'
import { languageMap } from '@/constant'
import { LanguageSlideUpDialog } from '@/widgets/setting/Language'
import CookieLogin from '@/widgets/signin/CookieLogin'
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Typography,
} from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TranslateIcon from '@mui/icons-material/Translate'
import { Alert } from '@mui/material'
import { NextPage } from 'next'
import { Trans, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { cache } from 'swr'

const FORUMS_LOGIN = 'https://forums.e-hentai.org/index.php?act=Login&CODE=00'
const EXHENTAI_HOME = 'https://exhentai.org/'

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  step: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  openBtn: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}))

const SignIn: NextPage = () => {
  const classes = useStyles()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [t, i18n] = useTranslation()

  useEffect(() => {
    cache.clear()
    return () => {
      cache.clear()
    }
  }, [])

  const onSubmit = async (payload: UserPayload) => {
    try {
      setLoading(true)
      payload.method = 'cookie'
      let res = await login(payload)
      setLoading(false)
      if (!res.error) {
        message.success(res.message)
        router.replace('/')
      } else {
        message.error(res.message)
      }
    } catch (error) {
      setLoading(false)
    }
  }

  const openUrl = (url: string) => {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) {
      message.error(t('SignIn.PopupBlocked'))
    }
  }

  return (
    <Container component="main" maxWidth="xs">
      <div className={classes.paper}>
        <Typography variant="h4" component="h6" gutterBottom>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            EHentaiView
            <Button startIcon={<TranslateIcon />} onClick={() => setOpen(true)}>
              {languageMap[i18n.language]}
            </Button>
          </Box>
        </Typography>

        <Typography component="h1" variant="h5" gutterBottom>
          {t('SignIn')}
        </Typography>

        <Box m="16px 0">
          <Alert severity="info">
            <Trans i18nKey="SignIn.info">
              Sign in on
              <Link
                href={FORUMS_LOGIN}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
              >
                {' e-hentai '}
              </Link>
              in this browser, then paste the cookies below so this app can use
              them (HttpOnly on our origin). Email/password login is no longer
              available.
            </Trans>
          </Alert>
        </Box>

        <Typography variant="subtitle1" className={classes.step} gutterBottom>
          {`1. ${t('SignIn.OpenForums')}`}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          className={classes.openBtn}
          endIcon={<OpenInNewIcon />}
          onClick={() => openUrl(FORUMS_LOGIN)}
        >
          {t('SignIn.OpenForumsBtn')}
        </Button>

        <Typography variant="subtitle1" className={classes.step} gutterBottom>
          {`2. ${t('SignIn.OpenExhentai')}`}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {t('SignIn.OpenExhentaiHint')}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          className={classes.openBtn}
          endIcon={<OpenInNewIcon />}
          onClick={() => openUrl(EXHENTAI_HOME)}
        >
          {t('SignIn.OpenExhentaiBtn')}
        </Button>

        <Typography variant="subtitle1" className={classes.step} gutterBottom>
          {`3. ${t('SignIn.PasteCookies')}`}
        </Typography>
        <CookieLogin onSubmit={onSubmit} />

        <Backdrop open={loading} className={classes.backdrop}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </div>
      <LanguageSlideUpDialog open={open} setOpen={setOpen} />
    </Container>
  )
}

export default SignIn

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
