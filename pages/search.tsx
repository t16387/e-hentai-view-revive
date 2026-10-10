import AdvancedSearch from '@/components/search/AdvancedSearch'
import CategoryChips from '@/components/search/CategoryChips'
import { LOCAL_SEARCH_HISTORY } from '@/constant'
import useEnhanceLocalStorageState from '@/hooks/useEnhanceLocalStorageState'
import {
  CAT_ALL,
  SearchFilters,
  catsToHideMask,
  hideMaskToIncluded,
  parseGalleryUrl,
  readSearchFilters,
  searchHref,
} from '@/utils/search'
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Toolbar,
  Zoom,
} from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'

const useStyles = makeStyles((theme) =>
  createStyles({
    formroot: { flex: 1 },
    input: {
      fontSize: '1.25rem',
      width: '100%',
      '& ::-webkit-search-cancel-button': {
        '-webkit-appearance': 'none',
      },
    },
    inputEndIcon: { fontSize: 24, color: 'inherit' },
    body: { paddingTop: theme.spacing(1), paddingBottom: theme.spacing(2) },
    actions: {
      display: 'flex',
      gap: theme.spacing(1),
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(2),
    },
  })
)

const emptyFilters = (): SearchFilters => ({})

const Search = () => {
  const [t] = useTranslation()
  const classes = useStyles()
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters)
  const [included, setIncluded] = useState(CAT_ALL)
  const [searchHistories, setSearchHistories] = useEnhanceLocalStorageState<
    string[]
  >(LOCAL_SEARCH_HISTORY, [])

  useEffect(() => {
    if (!router.isReady) return
    const f = readSearchFilters(router.query)
    setFilters(f)
    setIncluded(hideMaskToIncluded(f.f_cats ?? 0))
  }, [router.isReady, router.query])

  const currentFilters = (): SearchFilters => {
    const hide = catsToHideMask(included)
    return {
      ...filters,
      f_cats: hide || undefined,
    }
  }

  const handleGoResult = (next: SearchFilters) => {
    const q = (next.f_search || '').trim()
    if (q) {
      const gallery = parseGalleryUrl(q)
      if (gallery) {
        return router.replace(
          '/[gid]/[token]',
          `/${gallery.gid}/${gallery.token}`
        )
      }
      setSearchHistories(
        [q, ...searchHistories.filter((v) => v !== q)].slice(0, 50)
      )
    }
    router.replace(searchHref(next))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const next = currentFilters()
    // allow category/advanced-only browse (empty query), like the site
    handleGoResult(next)
  }

  const handleClear = () => {
    setFilters(emptyFilters())
    setIncluded(CAT_ALL)
    ref.current?.focus()
  }

  return (
    <>
      <AppBar position="fixed" elevation={1}>
        <Toolbar>
          <IconButton onClick={() => router.back()} edge="start" size="large">
            <ArrowBackIcon />
          </IconButton>
          <form
            action="/result"
            onSubmit={handleSubmit}
            method="GET"
            className={classes.formroot}
          >
            <InputBase
              placeholder={t('Search')}
              value={filters.f_search || ''}
              name="f_search"
              autoFocus
              inputProps={{
                maxLength: 2000,
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: false,
              }}
              inputRef={ref}
              onChange={(e) =>
                setFilters((f) => ({ ...f, f_search: e.target.value }))
              }
              className={classes.input}
              type="search"
            />
          </form>
          <Zoom in={!!(filters.f_search && filters.f_search.length > 0)}>
            <IconButton
              edge="end"
              onClick={() => {
                setFilters((f) => ({ ...f, f_search: '' }))
                ref.current?.focus()
              }}
              className={classes.inputEndIcon}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Zoom>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container maxWidth="sm" className={classes.body}>
        <CategoryChips included={included} onChange={setIncluded} />
        <AdvancedSearch value={filters} onChange={setFilters} />
        <Box className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleGoResult(currentFilters())}
          >
            {t('Search.Apply')}
          </Button>
          <Button variant="outlined" onClick={handleClear}>
            {t('Search.Clear')}
          </Button>
        </Box>
        <List>
          {searchHistories.map((o, k) => (
            <ListItem
              button
              key={k}
              onClick={() =>
                handleGoResult({ ...currentFilters(), f_search: o })
              }
            >
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText primary={o} />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => {
                    searchHistories.splice(k, 1)
                    setSearchHistories([...searchHistories])
                  }}
                  size="large"
                >
                  <CloseIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Container>
    </>
  )
}

export default Search

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  }
}
