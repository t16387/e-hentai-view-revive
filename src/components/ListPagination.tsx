import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'

/**
 * Creative direction seed: "e-hentai-view v3"
 * - e → emerald/teal nav discs
 * - h → horizon amber jump CTA
 * - view → viewfinder frame around the page index
 * - v3 → three-zone layout (prev | lens | next), triangular chevron rhythm
 */

const TEAL = '#0D7377'
const TEAL_LIGHT = '#14A3A8'
const AMBER = '#E8A838'
const AMBER_TEXT = '#1A1205'

const useStyles = makeStyles((theme: Theme) => {
  const isDark = theme.palette.mode === 'dark'
  const teal = isDark ? TEAL_LIGHT : TEAL
  return createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1.75, 1),
      width: '100%',
      maxWidth: 520,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    /** Three-zone control strip */
    strip: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center',
      gap: theme.spacing(1),
      width: '100%',
      padding: theme.spacing(0.75),
      borderRadius: 14,
      background: isDark ? alpha('#0D7377', 0.18) : alpha('#0D7377', 0.06),
      border: `1px solid ${alpha(teal, isDark ? 0.45 : 0.28)}`,
      boxShadow: isDark
        ? `0 0 0 1px ${alpha('#fff', 0.04)}`
        : `0 1px 2px ${alpha('#0D7377', 0.08)}`,
    },
    disc: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      backgroundColor: teal,
      color: '#fff',
      boxShadow: `0 2px 0 ${alpha('#000', 0.18)}`,
      '&:hover': {
        backgroundColor: isDark ? TEAL : TEAL_LIGHT,
      },
      '&.Mui-disabled': {
        backgroundColor: alpha(teal, 0.28),
        color: alpha('#fff', 0.55),
      },
    },
    /** Viewfinder / lens for current page */
    lens: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      padding: theme.spacing(0.5, 1.25),
      borderRadius: 10,
      border: `2px solid ${alpha(teal, 0.55)}`,
      background: isDark ? alpha('#000', 0.35) : alpha('#fff', 0.85),
      boxShadow: `inset 0 0 0 1px ${alpha(AMBER, 0.35)}`,
    },
    pageLabel: {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontWeight: 700,
      fontSize: '0.95rem',
      letterSpacing: 0.4,
      lineHeight: 1.2,
      color: isDark ? '#E8F6F6' : '#0A3D3F',
      userSelect: 'none',
      textAlign: 'center',
    },
    jump: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    field: {
      width: 80,
      '& .MuiOutlinedInput-root': {
        borderRadius: 10,
        minHeight: 44,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
    },
    go: {
      minHeight: 44,
      minWidth: 56,
      borderRadius: 10,
      fontWeight: 800,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      backgroundColor: AMBER,
      color: AMBER_TEXT,
      boxShadow: `0 2px 0 ${alpha('#8A5A10', 0.45)}`,
      '&:hover': {
        backgroundColor: '#F0B84A',
      },
      '&.Mui-disabled': {
        backgroundColor: alpha(AMBER, 0.35),
        color: alpha(AMBER_TEXT, 0.45),
      },
    },
    hint: {
      width: '100%',
      textAlign: 'center',
    },
    cap: {
      fontSize: '0.65rem',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: alpha(teal, 0.9),
      fontWeight: 700,
      marginBottom: 2,
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
      data-pager="ehv-v3"
    >
      <Box className={classes.strip}>
        <IconButton
          className={classes.disc}
          onClick={onPrev}
          disabled={disabled || !hasPrev}
          aria-label={t('List.Prev')}
          size="large"
        >
          <ChevronLeftIcon />
        </IconButton>
        <Box className={classes.lens} aria-live="polite">
          <Typography className={classes.cap} component="span">
            view
          </Typography>
          <Typography className={classes.pageLabel}>{pageLabel}</Typography>
        </Box>
        <IconButton
          className={classes.disc}
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
