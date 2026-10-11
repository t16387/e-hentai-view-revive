import { V4 } from '@/design/v4Tokens'
import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'

/**
 * UI V4 pager — Cyberpunk tokens + Minimal/Swiss discipline.
 * Replaces the V3 teal/amber viewfinder strip. Semantics unchanged.
 */

const useStyles = makeStyles((theme: Theme) => {
  const dark = theme.palette.mode === 'dark'
  const primary = dark ? V4.primary : V4.light.primary
  const card = dark ? V4.card : V4.light.card
  const fg = dark ? V4.foreground : V4.light.foreground
  const mutedFg = dark ? V4.mutedForeground : V4.light.mutedForeground
  const border = dark ? V4.border : V4.light.border
  const ring = dark ? V4.ring : V4.light.ring
  return createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing(1.25),
      padding: theme.spacing(1.5, 1),
      width: '100%',
      maxWidth: 480,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    strip: {
      display: 'grid',
      gridTemplateColumns: '48px 1fr 48px',
      alignItems: 'center',
      gap: theme.spacing(1),
      width: '100%',
      padding: theme.spacing(0.75),
      borderRadius: 8,
      background: dark ? alpha(V4.muted, 0.65) : alpha(V4.light.muted, 0.95),
      border: `1px solid ${alpha(border, dark ? 0.7 : 1)}`,
    },
    navBtn: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: primary,
      color: dark ? V4.foreground : '#fff',
      cursor: 'pointer',
      transition: 'background-color 200ms ease, opacity 200ms ease',
      '&:hover': {
        backgroundColor: dark ? V4.primaryMuted : alpha(primary, 0.88),
      },
      '&.Mui-disabled': {
        backgroundColor: alpha(primary, 0.28),
        color: alpha(fg, 0.45),
      },
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    pageBox: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      padding: theme.spacing(0.5, 1.25),
      borderRadius: 8,
      border: `1px solid ${alpha(border, 0.9)}`,
      background: card,
    },
    pageLabel: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '0.95rem',
      letterSpacing: 0.2,
      lineHeight: 1.3,
      color: fg,
      userSelect: 'none',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    jump: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    field: {
      width: 88,
      '& .MuiOutlinedInput-root': {
        borderRadius: 8,
        minHeight: 44,
        fontFamily: 'Inter, sans-serif',
        backgroundColor: card,
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(primary, 0.55),
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: primary,
          borderWidth: 2,
        },
      },
    },
    go: {
      minHeight: 44,
      minWidth: 64,
      borderRadius: 8,
      fontWeight: 700,
      letterSpacing: 0.4,
      textTransform: 'none',
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      backgroundColor: V4.accent,
      color: V4.onAccent,
      transition: 'background-color 200ms ease, opacity 200ms ease',
      '&:hover': {
        backgroundColor: '#F59E0B',
      },
      '&.Mui-disabled': {
        backgroundColor: alpha(V4.accent, 0.35),
        color: alpha(V4.onAccent, 0.45),
      },
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    hint: {
      width: '100%',
      textAlign: 'center',
      color: mutedFg,
    },
  })
})

export interface ListPaginationProps {
  page: number
  estimatedPages: number | null
  total?: number
  totalText?: string
  hasPrev: boolean
  hasNext: boolean
  disabled?: boolean
  jumpError?: string | null
  onPrev: () => void
  onNext: () => void
  onJump: (page1Based: number) => void
}

const ListPagination: React.FC<ListPaginationProps> = ({
  page,
  estimatedPages,
  totalText,
  hasPrev,
  hasNext,
  disabled,
  jumpError,
  onPrev,
  onNext,
  onJump,
}) => {
  const classes = useStyles()
  const [t] = useTranslation()
  const [draft, setDraft] = useState(String(page))

  useEffect(() => {
    setDraft(String(page))
  }, [page])

  const submitJump = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(draft, 10)
    if (Number.isFinite(n)) onJump(n)
  }

  const pageLabel =
    estimatedPages != null
      ? t('List.PageOf', { page, total: estimatedPages })
      : t('List.Page', { page })

  return (
    <Box
      className={classes.root}
      component="nav"
      aria-label={t('List.Pagination')}
      data-pager="ehv-v4"
    >
      <Box className={classes.strip}>
        <IconButton
          className={classes.navBtn}
          onClick={onPrev}
          disabled={disabled || !hasPrev}
          aria-label={t('List.Prev')}
          size="large"
        >
          <ChevronLeftIcon />
        </IconButton>
        <Box className={classes.pageBox} aria-live="polite">
          <Typography className={classes.pageLabel}>{pageLabel}</Typography>
        </Box>
        <IconButton
          className={classes.navBtn}
          onClick={onNext}
          disabled={disabled || !hasNext}
          aria-label={t('List.Next')}
          size="large"
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
      <form className={classes.jump} onSubmit={submitJump}>
        <TextField
          className={classes.field}
          size="small"
          type="number"
          inputProps={{
            min: 1,
            max: estimatedPages ?? undefined,
            'aria-label': t('List.Jump'),
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
        />
        <Button
          type="submit"
          className={classes.go}
          disabled={disabled}
          disableElevation
        >
          {t('List.Go')}
        </Button>
      </form>
      {totalText ? (
        <Typography
          variant="caption"
          color="textSecondary"
          className={classes.hint}
        >
          {totalText}
        </Typography>
      ) : null}
      {jumpError === 'tooFar' ? (
        <Typography variant="caption" color="error" className={classes.hint}>
          {t('List.JumpTooFar')}
        </Typography>
      ) : null}
      {jumpError === 'end' ? (
        <Typography
          variant="caption"
          color="textSecondary"
          className={classes.hint}
        >
          {t('List.JumpEnd')}
        </Typography>
      ) : null}
      {jumpError === 'invalid' ? (
        <Typography variant="caption" color="error" className={classes.hint}>
          {t('List.JumpInvalid')}
        </Typography>
      ) : null}
    </Box>
  )
}

export default ListPagination
