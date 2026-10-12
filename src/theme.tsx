import { V4 } from '@/design/v4Tokens'
import { DEFAULT_UI_THEME, UiThemeId, readUiTheme } from '@/utils/uiThemePrefs'
import { useMediaQuery } from '@mui/material'
import { blue, pink } from '@mui/material/colors'
import {
  createTheme,
  darken,
  StyledEngineProvider,
  Theme,
  ThemeProvider as MuiThemeProvider,
} from '@mui/material/styles'
import React, {
  createContext,
  FC,
  Reducer,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
declare module '@mui/styles/defaultTheme' {
  interface DefaultTheme extends Theme {}
}

export const DispatchContext = createContext<React.Dispatch<Action>>(() => {})
export const IsMobile = createContext<boolean | null>(null)
export const UiThemeContext = createContext<UiThemeId>(DEFAULT_UI_THEME)

export type Action = {
  type: 'CHANGE'
  payload: Partial<InitialThemeOptionsProps>
}
export interface InitialThemeOptionsProps {
  paletteType: 'dark' | 'light'
  uiTheme: UiThemeId
}
const InitialThemeOptions: InitialThemeOptionsProps = {
  paletteType: 'light',
  uiTheme: DEFAULT_UI_THEME,
}

function createAppTheme(
  paletteType: 'dark' | 'light',
  uiTheme: UiThemeId
): Theme {
  const dark = paletteType === 'dark'

  if (uiTheme === 'v4') {
    return createTheme({
      typography: {
        fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
        h1: { fontFamily: 'Inter, sans-serif', fontWeight: 700 },
        h2: { fontFamily: 'Inter, sans-serif', fontWeight: 700 },
        h3: { fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        h4: { fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        h5: { fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        h6: { fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        button: {
          fontFamily: 'Inter, sans-serif',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
      palette: {
        mode: paletteType,
        primary: {
          main: dark ? V4.primary : V4.light.primary,
          contrastText: dark ? V4.foreground : '#fff',
        },
        secondary: {
          main: V4.accent,
          contrastText: V4.onAccent,
        },
        error: {
          main: V4.destructive,
        },
        background: {
          default: dark ? V4.background : V4.light.background,
          paper: dark ? V4.card : V4.light.card,
        },
        text: {
          primary: dark ? V4.foreground : V4.light.foreground,
          secondary: dark ? V4.mutedForeground : V4.light.mutedForeground,
        },
        divider: dark ? V4.border : V4.light.border,
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '@media (prefers-reduced-motion: reduce)': {
              '*, *::before, *::after': {
                animationDuration: '0.01ms !important',
                animationIterationCount: '1 !important',
                transitionDuration: '0.01ms !important',
                scrollBehavior: 'auto !important',
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: dark
            ? {
                colorPrimary: {
                  color: V4.foreground,
                  backgroundColor: V4.card,
                },
              }
            : {
                colorPrimary: {
                  backgroundColor: V4.light.card,
                  color: 'rgba(15,23,42,0.72)',
                },
              },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              cursor: 'pointer',
              minHeight: 40,
              borderRadius: 8,
              transition:
                'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease, opacity 200ms ease',
              '&:focus-visible': {
                outline: `2px solid ${dark ? V4.ring : V4.light.ring}`,
                outlineOffset: 2,
              },
            },
            containedSecondary: {
              color: V4.onAccent,
              backgroundColor: V4.accent,
              '&:hover': {
                backgroundColor: '#F59E0B',
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              cursor: 'pointer',
              '&:focus-visible': {
                outline: `2px solid ${dark ? V4.ring : V4.light.ring}`,
                outlineOffset: 2,
              },
            },
          },
        },
      },
    })
  }

  // Classic / V3 — original MUI blue/pink palette (Filter Deck V3 uses theme.primary)
  return createTheme({
    palette: {
      mode: paletteType,
      primary: {
        main: paletteType === 'light' ? blue[700] : blue[200],
      },
      secondary: {
        main: paletteType === 'light' ? darken(pink.A400, 0.1) : pink[200],
      },
      background: {
        default: paletteType === 'light' ? '#fff' : '#121212',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides:
          paletteType === 'dark'
            ? { colorPrimary: { color: '#fff', backgroundColor: '#333' } }
            : {
                colorPrimary: {
                  backgroundColor: '#fff',
                  color: 'rgba(0,0,0,0.54)',
                },
              },
      },
      MuiButton: {
        styleOverrides:
          paletteType === 'light' ? { root: { color: '#555' } } : {},
      },
    },
  })
}

const ThemeProvider: FC<{}> = ({ children }) => {
  const [themeOptions, dispatch] = useReducer<
    Reducer<InitialThemeOptionsProps, Action>
  >((state, action) => {
    switch (action.type) {
      case 'CHANGE':
        return {
          ...state,
          ...action.payload,
        }
      default:
        return state
    }
  }, InitialThemeOptions)

  const { paletteType, uiTheme } = themeOptions
  const theme = useMemo(
    () => createAppTheme(paletteType, uiTheme),
    [paletteType, uiTheme]
  )

  const matches = useMediaQuery(theme.breakpoints.down('sm'), {
    defaultMatches: true,
  })
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)', {
    noSsr: true,
  })

  useEffect(() => {
    let newPaletteType = localStorage.getItem('paletteType') as
      | InitialThemeOptionsProps['paletteType']
      | null
    newPaletteType = newPaletteType
      ? newPaletteType
      : isDarkMode
      ? 'dark'
      : 'light'

    const nextUiTheme = readUiTheme()
    dispatch({
      type: 'CHANGE',
      payload: { paletteType: newPaletteType, uiTheme: nextUiTheme },
    })
  }, [isDarkMode])

  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name=theme-color]')
    const color =
      uiTheme === 'v4'
        ? paletteType === 'dark'
          ? V4.background
          : V4.light.background
        : paletteType === 'dark'
        ? '#121212'
        : '#fff'
    themeColorMeta?.setAttribute('content', color)
  }, [paletteType, uiTheme])

  return (
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider theme={theme}>
        <DispatchContext.Provider value={dispatch}>
          <UiThemeContext.Provider value={uiTheme}>
            <IsMobile.Provider value={matches}>{children}</IsMobile.Provider>
          </UiThemeContext.Provider>
        </DispatchContext.Provider>
      </MuiThemeProvider>
    </StyledEngineProvider>
  )
}

export default ThemeProvider

export function useThemeState() {
  const dispatch = useContext(DispatchContext)
  return dispatch
}
export function useIsmobile() {
  const matches = useContext(IsMobile)
  return matches
}

/** Current UI chrome theme (classic / v3 / v4). Updates live when Settings changes it. */
export function useUiTheme(): UiThemeId {
  return useContext(UiThemeContext)
}
