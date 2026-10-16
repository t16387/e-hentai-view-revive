import message from '@/components/message'
import { clearWatchHistory } from '@/utils/clearWatchHistory'
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Button,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useTranslation } from 'next-i18next'
import React from 'react'

const ClearWatchHistory = () => {
  const [t] = useTranslation()

  const handle = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(t('History.Clear.Confirm') as string)
    ) {
      return
    }
    clearWatchHistory()
    message.success(t('History.Cleared'))
  }

  return (
    <ListItem>
      <ListItemIcon>
        <DeleteOutlineIcon />
      </ListItemIcon>
      <ListItemText
        primary={t('History.Clear')}
        secondary={t('History.Clear.Hint')}
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          color="secondary"
          variant="outlined"
          onClick={handle}
        >
          {t('History.Clear')}
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default ClearWatchHistory
