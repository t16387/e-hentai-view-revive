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

const useStyles = makeStyles((theme: Theme) => {
  const dark = theme.palette.mode === 'dark'
  const primary = dark ? V4.primary : V4.light.primary
  const card = dark ? V4.card : V4.light.card
  const border = dark ? V4.border : V4.light.border
  const ring = dark ? V4.ring : V4.light.ring
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
      gap: theme.spacing(1),
      alignItems: 'center',
      marginBottom: theme.spacing(0.75),
      padding: theme.spacing(1),
      borderRadius: 8,
      backgroundColor: dark
        ? alpha(V4.muted, 0.55)
        : alpha(V4.light.muted, 0.95),
      border: `1px solid ${alpha(border, dark ? 0.7 : 1)}`,
    },
    editBtn: {
      minHeight: 44,
      borderRadius: 8,
      textTransform: 'none',
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      transition: 'background-color 200ms ease, border-color 200ms ease',
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    clearBtn: {
      minHeight: 44,
      borderRadius: 8,
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
      borderRadius: 8,
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
          size="small"
          className={classes.editBtn}
          startIcon={<TuneIcon />}
          variant="contained"
          color="primary"
          onClick={() =>
            router.push(searchHref(filters, '/search'), undefined, {
              shallow: false,
            })
          }
        >
          {t('Search.EditFilters')}
        </Button>
        {(filtersKey(filters) || included !== CAT_ALL) && (
          <Button
            size="small"
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
