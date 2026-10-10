import useDoNotStoreHistory from '@/hooks/useDoNotStoreHistory'
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
} from '@mui/material'
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff'
import { useTranslation } from 'next-i18next'
import React from 'react'

const DoNotStoreHistory = () => {
  const [t] = useTranslation()
  const [on, setOn] = useDoNotStoreHistory()

  return (
    <ListItem>
      <ListItemIcon>
        <HistoryToggleOffIcon />
      </ListItemIcon>
      <ListItemText
        primary={t('History.DoNotStore')}
        secondary={t('History.DoNotStore.Hint')}
      />
      <ListItemSecondaryAction>
        <Switch
          edge="end"
          checked={on}
          onChange={(_, checked) => setOn(checked)}
          inputProps={{ 'aria-label': t('History.DoNotStore') as string }}
        />
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default DoNotStoreHistory
