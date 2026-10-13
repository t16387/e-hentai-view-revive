import { login, UserPayload } from '@/apis'
import message from '@/components/message'
import { languageMap } from '@/constant'
import { LanguageSlideUpDialog } from '@/widgets/setting/Language'
import CookieLogin from '@/widgets/signin/CookieLogin'
import Login from '@/widgets/signin/Login'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TranslateIcon from '@mui/icons-material/Translate'
import { Alert } from '@mui/material'
import { NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { cache } from 'swr'

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
  advanced: {
    marginTop: theme.spacing(3),
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
      const isCookie =
        payload.method === 'cookie' ||
        !!(payload.ipb_member_id && payload.ipb_pass_hash)
      if (isCookie) {
        payload.method = 'cookie'
      } else {
        delete payload.method
      }
      const res = await login(payload)
      setLoading(false)
      if (!res.error) {
        message.success(res.message)
        router.replace('/')
      } else {
        message.error(res.message)
      }
    } catch (error: any) {
      setLoading(false)
      const msg =
        (error &&
          error.response &&
          error.response.data &&
          error.response.data.message) ||
        (error && error.message) ||
        t('SignIn.LoginFailed')
      message.error(msg)
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
          <Alert severity="info">{t('SignIn.info')}</Alert>
        </Box>

        <Login onSubmit={onSubmit} />

        <Accordion elevation={0} className={classes.advanced}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="advanced-cookie-login"
            id="advanced-cookie-login-header"
          >
            <Typography variant="body2" color="textSecondary">
              {t('SignIn.AdvancedCookie')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails style={{ flexDirection: 'column', padding: 0 }}>
            <Alert severity="warning" style={{ marginBottom: 8 }}>
              {t('SignIn.AdvancedCookieHint')}
            </Alert>
            <CookieLogin onSubmit={onSubmit} />
          </AccordionDetails>
        </Accordion>

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
