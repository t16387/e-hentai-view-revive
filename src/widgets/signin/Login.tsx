import React from 'react'
import { Theme } from '@mui/material/styles'
import makeStyles from '@mui/styles/makeStyles'
import createStyles from '@mui/styles/createStyles'
import { TextField, Button } from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { UserPayload } from '@/apis'
import { useTranslation } from 'next-i18next'

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
  })
)

export type PasswordLoginValues = {
  UserName: string
  PassWord: string
}

const Login: React.FC<{ onSubmit: (v: UserPayload) => any }> = ({
  onSubmit,
}) => {
  const classes = useStyles()
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PasswordLoginValues>({
    mode: 'onSubmit',
    defaultValues: { UserName: '', PassWord: '' },
  })
  const [t] = useTranslation()

  return (
    <form
      onSubmit={handleSubmit((v) => {
        onSubmit({
          UserName: (v.UserName || '').trim(),
          PassWord: v.PassWord || '',
        })
      })}
      className={classes.form}
      noValidate
      autoComplete="on"
    >
      <Controller
        name="UserName"
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
            id="UserName"
            label={t('SignIn.EmailAddress')}
            autoComplete="username"
            autoFocus
            error={!!errors.UserName}
            helperText={errors.UserName ? t('SignIn.RequiredField') : undefined}
            {...field}
          />
        )}
      />
      <Controller
        name="PassWord"
        control={control}
        rules={{
          required: true,
          validate: (v) => !!(v && String(v).length > 0),
        }}
        render={({ field }) => (
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('SignIn.Password')}
            type="password"
            id="PassWord"
            autoComplete="current-password"
            error={!!errors.PassWord}
            helperText={errors.PassWord ? t('SignIn.RequiredField') : undefined}
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
        {t('SignIn')}
      </Button>
    </form>
  )
}

export default Login
