import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1.5, 0),
    },
    label: {
      minWidth: 96,
      textAlign: 'center',
      userSelect: 'none',
    },
    jump: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    },
    field: {
      width: 72,
    },
    hint: {
      width: '100%',
      textAlign: 'center',
    },
  })
)

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

const ListPaginationClassic: React.FC<ListPaginationProps> = ({
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
      data-pager="ehv-classic"
    >
      <IconButton
        size="small"
        onClick={onPrev}
        disabled={disabled || !hasPrev}
        aria-label={t('List.Prev')}
      >
        <ChevronLeftIcon />
      </IconButton>
      <Typography variant="body2" className={classes.label}>
        {pageLabel}
      </Typography>
      <IconButton
        size="small"
        onClick={onNext}
        disabled={disabled || !hasNext}
        aria-label={t('List.Next')}
      >
        <ChevronRightIcon />
      </IconButton>
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
          size="small"
          variant="outlined"
          disabled={disabled}
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

export default ListPaginationClassic
