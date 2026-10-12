import ColorChip from '@/components/ColorChip'
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1),
      flexWrap: 'wrap',
    },
    title: {
      fontWeight: 600,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      color: theme.palette.text.secondary,
    },
    actions: {
      display: 'inline-flex',
      gap: theme.spacing(0.5),
    },
    actionBtn: {
      minHeight: 36,
      [theme.breakpoints.down('sm')]: {
        minHeight: 44,
        minWidth: 72,
      },
      textTransform: 'none',
      borderRadius: 999,
      fontWeight: 600,
    },
    /** Responsive wrapping grid — phone 2-col, tablet/desktop 5-col. */
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1.5),
      [theme.breakpoints.up('sm')]: {
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      },
      [theme.breakpoints.up('md')]: {
        gap: theme.spacing(1.25),
      },
    },
    tile: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: 10,
      padding: theme.spacing(0.75, 1),
      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
      backgroundColor:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.common.white, 0.04)
          : alpha(theme.palette.common.black, 0.02),
      transition:
        'opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease',
      '&:active': {
        transform: 'scale(0.98)',
      },
    },
    tileOn: {
      boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
    tileOff: {
      opacity: 0.42,
      filter: 'grayscale(0.55)',
    },
    /** Compact horizontal wrap for index/result chrome. */
    compact: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(0.75),
      marginBottom: theme.spacing(0.75),
    },
    compactChip: {
      cursor: 'pointer',
      minHeight: 36,
      [theme.breakpoints.down('sm')]: {
        minHeight: 44,
      },
    },
    compactOff: {
      opacity: 0.35,
      filter: 'grayscale(0.6)',
    },
  })
)

export interface CategoryChipsProps {
  /** include-mask (bits set = category shown) */
  included: number
  onChange: (included: number) => void
  /** show All / None quick actions */
  showActions?: boolean
  /**
   * `deck` = V3 responsive tile grid (search page).
   * `compact` = wrapping chips for index/result filter bar.
   */
  variant?: 'deck' | 'compact'
}

const CategoryChipsV3: React.FC<CategoryChipsProps> = ({
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
        data-cat-row="ehv-v3"
      >
        {CAT_KEYS.map((key) => {
          const on = isCatIncluded(included, key)
          return (
            <ColorChip
              key={key}
              label={CAT_LABEL[key]}
              size="small"
              className={`${classes.compactChip}${
                on ? '' : ` ${classes.compactOff}`
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
        data-cat-deck="ehv-v3"
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
            >
              <ColorChip
                label={CAT_LABEL[key]}
                size="small"
                style={{ pointerEvents: 'none', maxWidth: '100%' }}
              />
            </ButtonBase>
          )
        })}
      </Box>
    </Box>
  )
}

export default CategoryChipsV3
