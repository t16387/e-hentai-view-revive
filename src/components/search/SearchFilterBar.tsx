import CategoryChips from '@/components/search/CategoryChips'
import { V4 } from '@/design/v4Tokens'
import {
  CAT_ALL,
  SearchFilters,
  catsToHideMask,
  filtersKey,
  hideMaskToIncluded,
  searchHref,
} from '@/utils/search'
import { Box, Button, Chip, Container } from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import TuneIcon from '@mui/icons-material/Tune'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { useMemo } from 'react'

const H = V4.control.height
const R = V4.control.radius
const G = V4.control.gap

const useStyles = makeStyles((theme: Theme) => {
  const dark = theme.palette.mode === 'dark'
  const primary = dark ? V4.primary : V4.light.primary
  const card = dark ? V4.card : V4.light.card
  const border = dark ? V4.border : V4.light.border
  const ring = dark ? V4.ring : V4.light.ring
  const fg = dark ? V4.foreground : V4.light.foreground
  return createStyles({
    root: {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(0.5),
      maxWidth: 960,
      marginLeft: 'auto',
      marginRight: 'auto',
      width: '100%',
    },
    rail: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: G,
      alignItems: 'center',
      marginBottom: theme.spacing(0.75),
      padding: theme.spacing(1),
      borderRadius: R,
      backgroundColor: dark
        ? alpha(V4.muted, 0.55)
        : alpha(V4.light.muted, 0.95),
      border: `1px solid ${alpha(border, dark ? 0.7 : 1)}`,
      minHeight: H + 16,
    },
    /** Edit filters — outlined control, same height as category pills (not a filled chip). */
    editBtn: {
      boxSizing: 'border-box',
      height: H,
      minHeight: H,
      maxHeight: H,
      borderRadius: R,
      paddingLeft: V4.control.padX + 4,
      paddingRight: V4.control.padX + 4,
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
      fontFamily: 'Inter, sans-serif',
      letterSpacing: 0.2,
      cursor: 'pointer',
      color: fg,
      backgroundColor: dark ? alpha(primary, 0.16) : alpha(primary, 0.1),
      border: `1.5px solid ${primary}`,
      boxShadow: 'none',
      transition:
        'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        backgroundColor: dark ? alpha(primary, 0.28) : alpha(primary, 0.18),
        borderColor: dark ? V4.primaryMuted : primary,
        boxShadow: `0 0 0 1px ${alpha(primary, 0.35)}`,
      },
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '& .MuiButton-startIcon': {
        marginRight: 6,
        color: primary,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    clearBtn: {
      boxSizing: 'border-box',
      height: H,
      minHeight: H,
      maxHeight: H,
      borderRadius: R,
      paddingLeft: V4.control.padX,
      paddingRight: V4.control.padX,
      textTransform: 'none',
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      borderColor: alpha(primary, 0.5),
      color: primary,
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
    },
    summaryChip: {
      height: 32,
      borderRadius: R,
      fontFamily: 'Inter, sans-serif',
      backgroundColor: dark ? alpha(card, 0.8) : card,
      border: `1px solid ${alpha(border, 0.6)}`,
    },
  })
})

export interface SearchFilterBarProps {
  filters: SearchFilters
  /** path used when toggling categories in place */
  path?: string
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  path = '/',
}) => {
  const classes = useStyles()
  const router = useRouter()
  const [t] = useTranslation()
  const included = hideMaskToIncluded(filters.f_cats ?? 0)

  const summary = useMemo(() => {
    const chips: string[] = []
    if (filters.f_sh) chips.push(t('Search.Expunged'))
    if (filters.f_sto) chips.push(t('Search.RequireTorrent'))
    if (filters.f_srdd)
      chips.push(`${t('Search.MinRating')} ≥ ${filters.f_srdd}`)
    if (filters.f_spf || filters.f_spt) {
      chips.push(
        `${filters.f_spf ?? '…'}–${filters.f_spt ?? '…'} ${t('Search.Pages')}`
      )
    }
    if (filters.language) chips.push(filters.language)
    if (filters.ai === 'only') chips.push(t('Search.AiOnly'))
    if (filters.ai === 'exclude') chips.push(t('Search.AiExclude'))
    if (filters.f_sfl || filters.f_sfu || filters.f_sft) {
      chips.push(t('Search.DisableFilters'))
    }
    return chips
  }, [filters, t])

  const push = (next: SearchFilters) => {
    router.push(searchHref(next, path), undefined, { shallow: true })
  }

  return (
    <Container maxWidth={false} disableGutters className={classes.root}>
      <CategoryChips
        included={included}
        showActions={false}
        variant="compact"
        onChange={(inc) => {
          const hide = catsToHideMask(inc)
          push({
            ...filters,
            f_cats: hide || undefined,
          })
        }}
      />
      <Box className={classes.rail} data-filter-rail="ehv-v4">
        {summary.map((s) => (
          <Chip
            key={s}
            size="small"
            label={s}
            className={classes.summaryChip}
          />
        ))}
        <Button
          className={classes.editBtn}
          startIcon={<TuneIcon fontSize="small" />}
          variant="outlined"
          disableElevation
          onClick={() =>
            router.push(searchHref(filters, '/search'), undefined, {
              shallow: false,
            })
          }
          data-edit-filters="ehv-v4"
        >
          {t('Search.EditFilters')}
        </Button>
        {(filtersKey(filters) || included !== CAT_ALL) && (
          <Button
            className={classes.clearBtn}
            variant="outlined"
            onClick={() => push({})}
          >
            {t('Search.Clear')}
          </Button>
        )}
      </Box>
    </Container>
  )
}

export default SearchFilterBar
