import { UserPayload } from '@/apis'
import { getElectronAPI, isElectronShell } from '@/utils/electronBridge'
import { Alert, Button, Typography } from '@mui/material'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(2),
    },
    submit: {
      margin: theme.spacing(1, 0, 1),
      fontSize: 'large',
      boxShadow: theme.shadows[16],
    },
    cancel: {
      marginBottom: theme.spacing(1),
    },
    hint: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  })
)

const WebViewLogin: React.FC<{
  onSubmit: (v: UserPayload) => any
  onBusy?: (busy: boolean) => void
}> = ({ onSubmit, onBusy }) => {
  const classes = useStyles()
  const [t] = useTranslation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const available = isElectronShell() && !!getElectronAPI()

  useEffect(() => {
    const api = getElectronAPI()
    if (!api) return

    const unsubCookies = api.onLoginCookies((cookies) => {
      setOpen(false)
      setError(null)
      onBusy && onBusy(true)
      onSubmit({
        method: 'cookie',
        ipb_member_id: cookies.ipb_member_id,
        ipb_pass_hash: cookies.ipb_pass_hash,
        igneous: cookies.igneous,
      })
    })

    const unsubEvents = api.onLoginWebViewEvent((payload) => {
      if (payload.reason === 'opened') {
        setOpen(true)
        setError(null)
      } else if (payload.reason === 'cancelled') {
        setOpen(false)
      } else if (payload.reason === 'load-failed') {
        setError(payload.message || t('SignIn.WebViewLoadFailed'))
      }
    })

    return () => {
      unsubCookies()
      unsubEvents()
    }
  }, [onSubmit, onBusy, t])

  if (!available) return null

  const start = async () => {
    setError(null)
    const api = getElectronAPI()
    if (!api) return
    try {
      const res = await api.openLoginWebView()
      if (!res.ok) {
        setError(res.message || t('SignIn.WebViewOpenFailed'))
        return
      }
      setOpen(true)
    } catch (e: any) {
      setError((e && e.message) || t('SignIn.WebViewOpenFailed'))
    }
  }

  const cancel = async () => {
    const api = getElectronAPI()
    if (api) await api.closeLoginWebView()
    setOpen(false)
  }

  return (
    <div className={classes.root} data-testid="webview-login">
      <Typography variant="h6" component="h2">
        {t('SignIn.WebViewLogin')}
      </Typography>
      <Typography
        variant="body2"
        color="textSecondary"
        className={classes.hint}
      >
        {t('SignIn.WebViewLoginHint')}
      </Typography>
      {error ? (
        <Alert severity="error" style={{ marginBottom: 8 }}>
          {error}
        </Alert>
      ) : (
        <Alert severity="info" style={{ marginBottom: 8 }}>
          {t('SignIn.WebViewLoginInfo')}
        </Alert>
      )}
      {!open ? (
        <Button
          type="button"
          id="open-webview-login"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          startIcon={<VpnKeyIcon />}
          onClick={start}
        >
          {t('SignIn.OpenWebViewLogin')}
        </Button>
      ) : (
        <Button
          type="button"
          id="cancel-webview-login"
          fullWidth
          variant="outlined"
          color="inherit"
          className={classes.cancel}
          onClick={cancel}
        >
          {t('SignIn.CancelWebViewLogin')}
        </Button>
      )}
    </div>
  )
}

export default WebViewLogin
