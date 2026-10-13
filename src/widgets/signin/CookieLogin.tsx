import { UserPayload } from '@/apis'
import {
  EH_FORUMS_LOGIN_URL,
  hasRequiredEhCookies,
  parseEhCookieDump,
} from '@/utils/parseEhCookieDump'
import { Button, TextField, Typography } from '@mui/material'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

/** legacy key that used to store cookie login secrets in localStorage */
export const LEGACY_COOKIE_STORAGE_KEY = 'cookie'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    form: {
      width: '100%',
      marginTop: theme.spacing(1),
    },
    submit: {
      margin: theme.spacing(3, 0, 2),
      fontSize: 'large',
      boxShadow: theme.shadows[16],
    },
    hint: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    openBtn: {
      marginBottom: theme.spacing(1),
    },
    dump: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  })
)

const CookieLogin: React.FC<{ onSubmit: (v: UserPayload) => any }> = ({
  onSubmit,
}) => {
  const classes = useStyles()
  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<UserPayload>({
    mode: 'onSubmit',
    defaultValues: {
      ipb_member_id: '',
      ipb_pass_hash: '',
      igneous: '',
    },
  })
  const [t] = useTranslation()
  const [dump, setDump] = useState('')
  const [dumpError, setDumpError] = useState<string | null>(null)

  // never keep secrets in localStorage; clear any leftover from older builds
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_COOKIE_STORAGE_KEY)
    } catch (_) {
      /* private mode */
    }
  }, [])

  const applyDump = (text: string) => {
    setDump(text)
    setDumpError(null)
    const parsed = parseEhCookieDump(text)
    if (!hasRequiredEhCookies(parsed)) {
      if (text.trim()) {
        setDumpError(t('SignIn.CookieDumpInvalid'))
      }
      return
    }
    setValue('ipb_member_id', parsed.ipb_member_id || '', {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('ipb_pass_hash', parsed.ipb_pass_hash || '', {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('igneous', parsed.igneous || '', {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const openForumsLogin = () => {
    window.open(EH_FORUMS_LOGIN_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <form
      onSubmit={handleSubmit((v) => {
        onSubmit({
          ipb_member_id: (v.ipb_member_id || '').trim(),
          ipb_pass_hash: (v.ipb_pass_hash || '').trim(),
          igneous: (v.igneous || '').trim() || undefined,
        })
      })}
      className={classes.form}
      noValidate
    >
      <Typography
        variant="body2"
        color="textSecondary"
        className={classes.hint}
      >
        {t('SignIn.CookieHint')}
      </Typography>

      <Button
        type="button"
        id="open-forums-login"
        fullWidth
        variant="outlined"
        color="primary"
        className={classes.openBtn}
        startIcon={<OpenInNewIcon />}
        onClick={openForumsLogin}
      >
        {t('SignIn.OpenForumsLogin')}
      </Button>

      <TextField
        className={classes.dump}
        margin="normal"
        fullWidth
        multiline
        minRows={3}
        id="cookie_dump"
        label={t('SignIn.CookieDump')}
        placeholder="ipb_member_id=…; ipb_pass_hash=…; igneous=…"
        autoComplete="off"
        value={dump}
        onChange={(e) => applyDump(e.target.value)}
        error={!!dumpError}
        helperText={dumpError || t('SignIn.CookieDumpHint')}
      />

      <Controller
        name="ipb_member_id"
        control={control}
        rules={{
          required: true,
          validate: (v) => !!(v && String(v).trim()),
        }}
        render={({ field }) => (
          <TextField
            margin="normal"
            required
            fullWidth
            id="ipb_member_id"
            label="ipb_member_id"
            autoComplete="off"
            error={!!errors.ipb_member_id}
            helperText={
              errors.ipb_member_id ? t('SignIn.RequiredField') : undefined
            }
            {...field}
          />
        )}
      />

      <Controller
        name="ipb_pass_hash"
        control={control}
        rules={{
          required: true,
          validate: (v) => !!(v && String(v).trim()),
        }}
        render={({ field }) => (
          <TextField
            margin="normal"
            required
            fullWidth
            label="ipb_pass_hash"
            id="ipb_pass_hash"
            autoComplete="off"
            error={!!errors.ipb_pass_hash}
            helperText={
              errors.ipb_pass_hash ? t('SignIn.RequiredField') : undefined
            }
            {...field}
          />
        )}
      />

      <Controller
        name="igneous"
        control={control}
        render={({ field }) => (
          <TextField
            margin="normal"
            fullWidth
            label="igneous"
            id="igneous"
            autoComplete="off"
            helperText={t('SignIn.IgneousHint')}
            {...field}
          />
        )}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        className={classes.submit}
      >
        {t('SignIn.SaveCookies')}
      </Button>
    </form>
  )
}

export default CookieLogin
