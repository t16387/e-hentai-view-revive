import ColorChip from '@/components/ColorChip'
import { V4 } from '@/design/v4Tokens'
import {
  CAT_KEYS,
  CAT_LABEL,
  CatKey,
  isCatIncluded,
  toggleCatIncluded,
} from '@/utils/search'
import { Box, Button, ButtonBase, Typography } from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { useTranslation } from 'next-i18next'
import React from 'react'

const useStyles = makeStyles((theme: Theme) => {
  const dark = theme.palette.mode === 'dark'
  const primary = dark ? V4.primary : V4.light.primary
  const mutedFg = dark ? V4.mutedForeground : V4.light.mutedForeground
  const border = dark ? V4.border : V4.light.border
  const ring = dark ? V4.ring : V4.light.ring
  return createStyles({
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1),
      flexWrap: 'wrap',
    },
    title: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      color: mutedFg,
    },
    actions: {
      display: 'inline-flex',
      gap: theme.spacing(1),
    },
    actionBtn: {
      minHeight: 44,
      minWidth: 72,
      padding: theme.spacing(0.75, 1.5),
      textTransform: 'none',
      borderRadius: 8,
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      borderColor: alpha(primary, 0.55),
      color: primary,
      transition:
        'background-color 200ms ease, border-color 200ms ease, opacity 200ms ease',
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    /** Wrap grid — phone 2-col, tablet 3-col, desktop 5-col. No clipped labels. */
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1.5),
      [theme.breakpoints.up('sm')]: {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      },
      [theme.breakpoints.up('md')]: {
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: theme.spacing(1.25),
      },
    },
    tile: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: 8,
      padding: theme.spacing(0.75, 1),
      cursor: 'pointer',
      border: `1px solid ${alpha(border, dark ? 0.85 : 1)}`,
      backgroundColor: dark
        ? alpha(V4.muted, 0.55)
        : alpha(V4.light.muted, 0.9),
      transition:
        'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease, opacity 200ms ease',
      '&:hover': {
        borderColor: alpha(primary, 0.65),
        backgroundColor: dark ? alpha(primary, 0.12) : alpha(primary, 0.06),
      },
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    tileOn: {
      borderColor: primary,
      boxShadow: `inset 0 0 0 1px ${primary}`,
      backgroundColor: dark ? alpha(primary, 0.18) : alpha(primary, 0.1),
    },
    tileOff: {
      opacity: 0.55,
    },
    chipLabel: {
      pointerEvents: 'none',
      maxWidth: '100%',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    /** Compact horizontal wrap for index/result chrome. */
    compact: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    compactChip: {
      cursor: 'pointer',
      '&&': {
        minHeight: 44,
        height: 44,
      },
      borderRadius: 8,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      transition: 'opacity 200ms ease, box-shadow 200ms ease',
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    compactOn: {
      boxShadow: `0 0 0 2px ${primary}`,
    },
    compactOff: {
      opacity: 0.42,
    },
  })
})

export interface CategoryChipsProps {
  /** include-mask (bits set = category shown) */
  included: number
  onChange: (included: number) => void
  /** show All / None quick actions */
  showActions?: boolean
  /**
   * `deck` = V4 responsive tile grid (search page).
   * `compact` = wrapping chips for index/result filter bar.
   */
  variant?: 'deck' | 'compact'
}

const CategoryChips: React.FC<CategoryChipsProps> = ({
  included,
  onChange,
  showActions = true,
  variant = 'deck',
}) => {
  const classes = useStyles()
  const [t] = useTranslation()

  const toggle = (key: CatKey) => {
    onChange(toggleCatIncluded(included, key))
  }

  if (variant === 'compact') {
    return (
      <Box
        className={classes.compact}
        role="group"
        aria-label={t('Search.Categories') as string}
      >
        {CAT_KEYS.map((key) => {
          const on = isCatIncluded(included, key)
          return (
            <ColorChip
              key={key}
              label={CAT_LABEL[key]}
              size="small"
              className={`${classes.compactChip}${
                on ? ` ${classes.compactOn}` : ` ${classes.compactOff}`
              }`}
              onClick={() => toggle(key)}
              aria-pressed={on}
              data-cat={key}
              data-included={on ? '1' : '0'}
            />
          )
        })}
      </Box>
    )
  }

  return (
    <Box>
      <Box className={classes.header}>
        <Typography className={classes.title} component="h2">
          {t('Search.Categories')}
        </Typography>
        {showActions && (
          <Box className={classes.actions}>
            <Button
              size="small"
              variant="outlined"
              className={classes.actionBtn}
              onClick={() => onChange(1023)}
            >
              {t('Search.CatAll')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              className={classes.actionBtn}
              onClick={() => onChange(0)}
            >
              {t('Search.CatNone')}
            </Button>
          </Box>
        )}
      </Box>
      <Box
        className={classes.grid}
        role="group"
        aria-label={t('Search.Categories') as string}
      >
        {CAT_KEYS.map((key) => {
          const on = isCatIncluded(included, key)
          return (
            <ButtonBase
              key={key}
              className={`${classes.tile}${
                on ? ` ${classes.tileOn}` : ` ${classes.tileOff}`
              }`}
              onClick={() => toggle(key)}
              aria-pressed={on}
              data-cat={key}
              data-included={on ? '1' : '0'}
              focusRipple
            >
              <ColorChip
                label={CAT_LABEL[key]}
                size="small"
                className={classes.chipLabel}
                style={{ pointerEvents: 'none', maxWidth: '100%' }}
              />
            </ButtonBase>
          )
        })}
      </Box>
    </Box>
  )
}

export default CategoryChips
