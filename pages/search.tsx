import AdvancedSearch from '@/components/search/AdvancedSearch'
import { V4 } from '@/design/v4Tokens'
import CategoryChips from '@/components/search/CategoryChips'
import { LOCAL_SEARCH_HISTORY } from '@/constant'
import useEnhanceLocalStorageState from '@/hooks/useEnhanceLocalStorageState'
import { useIsmobile, useUiTheme } from '@/theme'
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

/** Shared form chrome — theme-neutral. */
const useBaseStyles = makeStyles(() =>
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
  })
)

const useClassicStyles = makeStyles((theme: Theme) =>
  createStyles({
    body: {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(2),
    },
    actions: {
      display: 'flex',
      gap: theme.spacing(1),
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(2),
    },
  })
)

const useV3Styles = makeStyles((theme: Theme) =>
  createStyles({
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

const useV4Styles = makeStyles((theme: Theme) => {
  const dark = theme.palette.mode === 'dark'
  const primary = dark ? V4.primary : V4.light.primary
  const card = dark ? V4.card : V4.light.card
  const border = dark ? V4.border : V4.light.border
  const ring = dark ? V4.ring : V4.light.ring
  return createStyles({
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
      backgroundColor: alpha(card, dark ? 0.94 : 0.97),
      backdropFilter: 'blur(10px)',
      borderTop: `1px solid ${alpha(border, dark ? 0.75 : 1)}`,
      justifyContent: 'center',
      '@media (prefers-reduced-motion: reduce)': {
        backdropFilter: 'none',
      },
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
      borderRadius: 8,
      fontWeight: 700,
      textTransform: 'none',
      fontSize: '1rem',
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      backgroundColor: V4.accent,
      color: V4.onAccent,
      boxShadow: 'none',
      transition: 'background-color 200ms ease, opacity 200ms ease',
      '&:hover': {
        backgroundColor: '#F59E0B',
      },
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    clearBtn: {
      minHeight: 48,
      minWidth: 96,
      borderRadius: 8,
      textTransform: 'none',
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      borderColor: alpha(primary, 0.55),
      color: primary,
      transition: 'background-color 200ms ease, border-color 200ms ease',
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
    advancedBtn: {
      minHeight: 44,
      borderRadius: 8,
      textTransform: 'none',
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      cursor: 'pointer',
      marginBottom: theme.spacing(1.5),
      borderColor: alpha(primary, 0.45),
      '&:focus-visible': {
        outline: `2px solid ${ring}`,
        outlineOffset: 2,
      },
    },
    drawerPaper: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      maxHeight: '85vh',
      padding: theme.spacing(2),
      paddingBottom: `calc(${theme.spacing(
        2
      )} + env(safe-area-inset-bottom, 0px))`,
      backgroundColor: card,
    },
    drawerTitle: {
      fontWeight: 700,
      fontFamily: 'Inter, sans-serif',
      marginBottom: theme.spacing(1),
    },
  })
})

const emptyFilters = (): SearchFilters => ({})

const Search = () => {
  const [t] = useTranslation()
  const base = useBaseStyles()
  const classic = useClassicStyles()
  const v3 = useV3Styles()
  const v4 = useV4Styles()
  const uiTheme = useUiTheme()
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

  const useSheet = uiTheme !== 'classic' && Boolean(isPhone || matches)
  const chrome = uiTheme === 'v4' ? v4 : uiTheme === 'v3' ? v3 : null
  const bodyClass =
    uiTheme === 'classic' ? classic.body : uiTheme === 'v3' ? v3.body : v4.body

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
            className={base.formroot}
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
              className={base.input}
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
              className={base.inputEndIcon}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Zoom>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container
        maxWidth={uiTheme === 'classic' ? 'sm' : 'md'}
        className={bodyClass}
      >
        <CategoryChips
          included={included}
          onChange={setIncluded}
          variant={uiTheme === 'classic' ? 'compact' : 'deck'}
        />
        {useSheet && chrome ? (
          <Button
            className={chrome.advancedBtn}
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
        {uiTheme === 'classic' && (
          <Box className={classic.actions} data-filter-actions="ehv-classic">
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

      {chrome && (
        <Box
          className={chrome.stickyBar}
          data-filter-actions={uiTheme === 'v4' ? 'ehv-v4' : 'ehv-v3'}
        >
          <Box className={chrome.stickyInner}>
            <Button
              className={chrome.clearBtn}
              variant="outlined"
              onClick={handleClear}
            >
              {t('Search.Clear')}
            </Button>
            <Button
              className={chrome.applyBtn}
              variant="contained"
              color="primary"
              onClick={() => handleGoResult(currentFilters())}
            >
              {t('Search.Apply')}
            </Button>
          </Box>
        </Box>
      )}

      {chrome && (
        <Drawer
          anchor="bottom"
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          classes={{ paper: chrome.drawerPaper }}
          ModalProps={{ keepMounted: true }}
        >
          <Typography className={chrome.drawerTitle} variant="h6">
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
            className={chrome.applyBtn}
            onClick={() => setSheetOpen(false)}
            style={{ marginTop: 8 }}
          >
            {t('Search.Done')}
          </Button>
        </Drawer>
      )}
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
