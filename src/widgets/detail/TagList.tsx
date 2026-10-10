import { Detailpage } from '@/interface/gallery'
import { composeSelectedTags, searchHref } from '@/utils/search'
import { Box, Button, Chip, Fab, Tooltip, Typography } from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import CheckIcon from '@mui/icons-material/Check'
import SearchIcon from '@mui/icons-material/Search'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { useCallback, useMemo, useState } from 'react'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    key: {
      lineHeight: '26px',
      whiteSpace: 'nowrap',
    },
    chip: {
      margin: 2,
      minHeight: 32,
      [theme.breakpoints.down('sm')]: {
        minHeight: 44,
      },
    },
    selected: {
      backgroundColor: alpha(theme.palette.primary.main, 0.18),
      borderColor: theme.palette.primary.main,
      boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}`,
    },
    bar: {
      position: 'sticky',
      bottom: theme.spacing(2),
      zIndex: theme.zIndex.speedDial,
      display: 'flex',
      justifyContent: 'center',
      gap: theme.spacing(1),
      pointerEvents: 'none',
      marginTop: theme.spacing(1),
      '& > *': { pointerEvents: 'auto' },
    },
    fab: {
      textTransform: 'none',
      fontWeight: 600,
      minHeight: 44,
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
    },
  })
)

type SelectedTag = { namespace: string; name: string; key: string }

function tagKey(namespace: string, name: string) {
  return `${namespace}\0${name}`
}

const TagList: React.FC<Pick<Detailpage, 'tagList'>> = ({ tagList }) => {
  const router = useRouter()
  const classes = useStyles()
  const [t, i18n] = useTranslation()
  const isChinese = i18n.language === 'zh'
  const trans = (obj: any, key: string) => obj[isChinese ? key + '_CHS' : key]
  const [selected, setSelected] = useState<Record<string, SelectedTag>>({})

  const selectedList = useMemo(() => Object.values(selected), [selected])
  const count = selectedList.length

  const toggle = useCallback((namespace: string, name: string) => {
    const key = tagKey(namespace, name)
    setSelected((prev) => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { namespace, name, key } }
    })
  }, [])

  const clear = useCallback(() => setSelected({}), [])

  const confirmSearch = useCallback(() => {
    if (selectedList.length === 0) return
    const q = composeSelectedTags(selectedList)
    router.push(searchHref(q))
  }, [router, selectedList])

  return (
    <>
      {tagList.length === 0 && (
        <Typography align="center">{t('G.noTags')}</Typography>
      )}
      <table>
        <tbody>
          {tagList.map((o) => (
            <tr key={o.namespace}>
              <td align="right" valign="top" className={classes.key}>
                <Tooltip title={o.description} arrow>
                  <span>{trans(o, 'namespace')}</span>
                </Tooltip>
                :
              </td>
              <td>
                <div>
                  {o.tags.map((v) => {
                    const key = tagKey(o.namespace, v.name)
                    const isOn = !!selected[key]
                    return (
                      <Tooltip
                        key={v.name}
                        title={i18n.language === 'zh' ? v.intro : ''}
                        arrow
                      >
                        <Chip
                          label={trans(v, 'name')}
                          size="small"
                          variant="outlined"
                          icon={
                            isOn ? <CheckIcon fontSize="small" /> : undefined
                          }
                          style={{
                            borderStyle: v.dash ? 'dashed' : 'solid',
                          }}
                          className={`${classes.chip}${
                            isOn ? ` ${classes.selected}` : ''
                          }`}
                          clickable
                          aria-pressed={isOn}
                          onClick={() => toggle(o.namespace, v.name)}
                        />
                      </Tooltip>
                    )
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {count > 0 && (
        <Box
          className={classes.bar}
          role="region"
          aria-label={t('Tag.SelectedCount', { count }) as string}
        >
          <Button
            variant="outlined"
            size="medium"
            onClick={clear}
            className={classes.fab}
          >
            {t('Tag.ClearSelected')}
          </Button>
          <Fab
            variant="extended"
            color="primary"
            className={classes.fab}
            onClick={confirmSearch}
          >
            <SearchIcon style={{ marginRight: 6 }} />
            {t('Tag.SearchSelected')} ({count})
          </Fab>
        </Box>
      )}
    </>
  )
}

export default TagList
