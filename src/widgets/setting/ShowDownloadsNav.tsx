import useShowDownloadsNav from '@/hooks/useShowDownloadsNav'
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
} from '@mui/material'
import GetAppIcon from '@mui/icons-material/GetApp'
import { useTranslation } from 'next-i18next'
import React from 'react'

const ShowDownloadsNav = () => {
  const [t] = useTranslation()
  const [on, setOn] = useShowDownloadsNav()

  return (
    <ListItem>
      <ListItemIcon>
        <GetAppIcon />
      </ListItemIcon>
      <ListItemText
        primary={t('Download.ShowNav')}
        secondary={t('Download.ShowNav.Hint')}
      />
      <ListItemSecondaryAction>
        <Switch
          edge="end"
          checked={on}
          onChange={(_, checked) => setOn(checked)}
          inputProps={{ 'aria-label': t('Download.ShowNav') as string }}
        />
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default ShowDownloadsNav
