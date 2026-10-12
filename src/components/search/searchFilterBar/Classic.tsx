import CategoryChips from '@/components/search/CategoryChips'
import {
  CAT_ALL,
  SearchFilters,
  catsToHideMask,
  filtersKey,
  hideMaskToIncluded,
  searchHref,
} from '@/utils/search'
import { Box, Button, Chip } from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import TuneIcon from '@mui/icons-material/Tune'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { useMemo } from 'react'

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(0.5),
    },
    summary: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(0.5),
      alignItems: 'center',
      marginBottom: theme.spacing(0.5),
    },
  })
)

export interface SearchFilterBarProps {
  filters: SearchFilters
  path?: string
}

const SearchFilterBarClassic: React.FC<SearchFilterBarProps> = ({
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
    <Box className={classes.root} data-filter-rail="ehv-classic">
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
      <Box className={classes.summary}>
        {summary.map((s) => (
          <Chip key={s} size="small" label={s} />
        ))}
        <Button
          size="small"
          startIcon={<TuneIcon />}
          onClick={() =>
            router.push(searchHref(filters, '/search'), undefined, {
              shallow: false,
            })
          }
        >
          {t('Search.EditFilters')}
        </Button>
        {(filtersKey(filters) || included !== CAT_ALL) && (
          <Button size="small" onClick={() => push({})}>
            {t('Search.Clear')}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default SearchFilterBarClassic
