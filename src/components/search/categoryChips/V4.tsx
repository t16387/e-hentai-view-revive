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

const H = V4.control.height
const R = V4.control.radius
const G = V4.control.gap

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
      gap: G,
    },
    actionBtn: {
      minHeight: H,
      minWidth: 72,
      padding: theme.spacing(0.75, 1.5),
      textTransform: 'none',
      borderRadius: R,
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
    /** Wrap grid — phone 2-col, tablet 3-col, desktop 5-col. Equal tile height. */
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: G,
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
      boxSizing: 'border-box',
      height: H,
      minHeight: H,
      borderRadius: R,
      padding: theme.spacing(0, 1),
      cursor: 'pointer',
      border: `1.5px solid ${alpha(border, dark ? 0.85 : 1)}`,
      backgroundColor: dark
        ? alpha(V4.muted, 0.55)
        : alpha(V4.light.muted, 0.9),
      transition:
        'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease, opacity 200ms ease, filter 200ms ease',
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
      borderWidth: 2,
      boxShadow: `inset 0 0 0 1px ${alpha(primary, 0.55)}`,
      backgroundColor: dark ? alpha(primary, 0.2) : alpha(primary, 0.12),
      opacity: 1,
      filter: 'none',
    },
    tileOff: {
      opacity: 0.5,
      filter: 'saturate(0.65)',
    },
    chipLabel: {
      pointerEvents: 'none',
      maxWidth: '100%',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      // Flatten nested Chip height so tiles stay even
      '&&': {
        height: 28,
        minHeight: 28,
      },
    },
    /** Compact horizontal wrap for index/result chrome — equal height pills. */
    compact: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: G,
      marginBottom: theme.spacing(1),
    },
    compactChip: {
      cursor: 'pointer',
      boxSizing: 'border-box',
      '&&': {
        height: H,
        minHeight: H,
        maxHeight: H,
        borderRadius: R,
        border: `2px solid transparent`,
        paddingLeft: V4.control.padX,
        paddingRight: V4.control.padX,
      },
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '0.8125rem',
      letterSpacing: 0.15,
      transition:
        'opacity 200ms ease, box-shadow 200ms ease, border-color 200ms ease, filter 200ms ease',
      '& .MuiChip-label': {
        paddingLeft: 0,
        paddingRight: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '11rem',
      },
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    compactOn: {
      opacity: 1,
      filter: 'none',
      borderColor: `${primary} !important`,
      boxShadow: `0 0 0 1px ${alpha(primary, 0.35)}, 0 0 12px ${alpha(
        primary,
        0.25
      )}`,
    },
    compactOff: {
      opacity: 0.4,
      filter: 'saturate(0.55) brightness(0.92)',
      boxShadow: 'none',
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

const CategoryChipsV4: React.FC<CategoryChipsProps> = ({
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
        data-cat-row="ehv-v4"
      >
        {CAT_KEYS.map((key) => {
          const on = isCatIncluded(included, key)
          return (
            <ColorChip
              key={key}
              label={CAT_LABEL[key]}
              size="medium"
              className={`${classes.compactChip}${
                on ? ` ${classes.compactOn}` : ` ${classes.compactOff}`
              }`}
              onClick={() => toggle(key)}
              aria-pressed={on}
              title={CAT_LABEL[key]}
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
        data-cat-deck="ehv-v4"
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
                title={CAT_LABEL[key]}
              />
            </ButtonBase>
          )
        })}
      </Box>
    </Box>
  )
}

export default CategoryChipsV4
