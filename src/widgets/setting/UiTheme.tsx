import SlideUpDialog from '@/components/SlideUpDialog'
import { useThemeState, useUiTheme } from '@/theme'
import { UI_THEME_IDS, UiThemeId, writeUiTheme } from '@/utils/uiThemePrefs'
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
} from '@mui/material'
import PaletteIcon from '@mui/icons-material/Palette'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

const UiTheme = () => {
  const [t] = useTranslation()
  const uiTheme = useUiTheme()
  const dispatch = useThemeState()
  const [open, setOpen] = useState(false)

  const select = (id: UiThemeId) => {
    writeUiTheme(id)
    dispatch({ type: 'CHANGE', payload: { uiTheme: id } })
    setOpen(false)
  }

  return (
    <>
      <ListItem
        button
        onClick={() => {
          setOpen(true)
        }}
      >
        <ListItemIcon>
          <PaletteIcon />
        </ListItemIcon>
        <ListItemText
          primary={t('UiTheme')}
          secondary={t('UiTheme.' + uiTheme)}
        />
      </ListItem>
      <SlideUpDialog open={open} onClose={() => setOpen(false)}>
        <List>
          {UI_THEME_IDS.map((id) => (
            <ListItem button key={id} onClick={() => select(id)}>
              <ListItemIcon>
                <Radio checked={uiTheme === id} />
              </ListItemIcon>
              <ListItemText
                primary={t(`UiTheme.${id}`)}
                secondary={t(`UiTheme.${id}.Hint`)}
              />
            </ListItem>
          ))}
        </List>
      </SlideUpDialog>
    </>
  )
}

export default UiTheme
