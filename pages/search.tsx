import AdvancedSearch from '@/components/search/AdvancedSearch'
import CategoryChips from '@/components/search/CategoryChips'
import { LOCAL_SEARCH_HISTORY } from '@/constant'
import useEnhanceLocalStorageState from '@/hooks/useEnhanceLocalStorageState'
import { useIsmobile } from '@/theme'
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
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Toolbar,
  Typography,
  Zoom,
  useMediaQuery,
} from '@mui/material'
import { alpha, Theme, useTheme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import TuneIcon from '@mui/icons-material/Tune'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'

const useStyles = makeStyles((theme: Theme) =>
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
    body: {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(12),
      maxWidth: 720,
    },
    stickyBar: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.appBar,
      display: 'flex',
      gap: theme.spacing(1),
      padding: theme.spacing(1.25, 2),
      paddingBottom: `calc(${theme.spacing(
        1.25
      )} + env(safe-area-inset-bottom, 0px))`,
      backgroundColor: alpha(
        theme.palette.background.paper,
        theme.palette.mode === 'dark' ? 0.92 : 0.96
      ),
      backdropFilter: 'blur(8px)',
      borderTop: `1px solid ${theme.palette.divider}`,
      justifyContent: 'center',
    },
    stickyInner: {
      display: 'flex',
      gap: theme.spacing(1),
      width: '100%',
      maxWidth: 720,
    },
    applyBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      fontWeight: 700,
      textTransform: 'none',
      fontSize: '1rem',
    },
    clearBtn: {
      minHeight: 48,
      minWidth: 96,
      borderRadius: 12,
      textTransform: 'none',
      fontWeight: 600,
    },
    advancedBtn: {
      minHeight: 44,
      borderRadius: 999,
      textTransform: 'none',
      fontWeight: 600,
      marginBottom: theme.spacing(1.5),
    },
    drawerPaper: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '85vh',
      padding: theme.spacing(2),
      paddingBottom: `calc(${theme.spacing(
        2
      )} + env(safe-area-inset-bottom, 0px))`,
    },
    drawerTitle: {
      fontWeight: 700,
      marginBottom: theme.spacing(1),
    },
  })
)

const emptyFilters = (): SearchFilters => ({})

const Search = () => {
  const [t] = useTranslation()
  const classes = useStyles()
  const router = useRouter()
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), {
    defaultMatches: true,
  })
  const matches = useIsmobile()
  const ref = useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters)
  const [included, setIncluded] = useState(CAT_ALL)
  const [sheetOpen, setSheetOpen] = useState(false)
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
    handleGoResult(currentFilters())
  }

  const handleClear = () => {
    setFilters(emptyFilters())
    setIncluded(CAT_ALL)
    ref.current?.focus()
  }

  const useSheet = Boolean(isPhone || matches)

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
      <Container maxWidth="md" className={classes.body}>
        <CategoryChips
          included={included}
          onChange={setIncluded}
          variant="deck"
        />
        {useSheet ? (
          <Button
            className={classes.advancedBtn}
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={() => setSheetOpen(true)}
            fullWidth
          >
            {t('Search.ShowAdvanced')}
          </Button>
        ) : (
          <AdvancedSearch value={filters} onChange={setFilters} />
        )}
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

      <Box className={classes.stickyBar}>
        <Box className={classes.stickyInner}>
          <Button
            className={classes.clearBtn}
            variant="outlined"
            onClick={handleClear}
          >
            {t('Search.Clear')}
          </Button>
          <Button
            className={classes.applyBtn}
            variant="contained"
            color="primary"
            onClick={() => handleGoResult(currentFilters())}
          >
            {t('Search.Apply')}
          </Button>
        </Box>
      </Box>

      <Drawer
        anchor="bottom"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        classes={{ paper: classes.drawerPaper }}
        ModalProps={{ keepMounted: true }}
      >
        <Typography className={classes.drawerTitle} variant="h6">
          {t('Search.AdvancedSheet')}
        </Typography>
        <AdvancedSearch
          value={filters}
          onChange={setFilters}
          variant="bare"
          defaultOpen
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          className={classes.applyBtn}
          onClick={() => setSheetOpen(false)}
          style={{ marginTop: 8 }}
        >
          {t('Search.Done')}
        </Button>
      </Drawer>
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
