import message from '@/components/message'
import { clearServerCache } from '@/apis'
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Button,
  CircularProgress,
} from '@mui/material'
import CachedIcon from '@mui/icons-material/Cached'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'
import { cache } from 'swr'

const ClearCache = () => {
  const [t] = useTranslation()
  const [busy, setBusy] = useState(false)

  const handle = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await clearServerCache()
      try {
        cache.clear()
      } catch (_) {
        /* swr optional */
      }
      if (res.error) {
        message.error(t('Cache.ClearFailed'))
      } else {
        message.success(t('Cache.Cleared'))
      }
    } catch (e) {
      message.error(t('Cache.ClearFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ListItem>
      <ListItemIcon>
        <CachedIcon />
      </ListItemIcon>
      <ListItemText
        primary={t('Cache.Clear')}
        secondary={t('Cache.Clear.Hint')}
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          color="primary"
          variant="outlined"
          onClick={handle}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
        >
          {t('Cache.Clear')}
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default ClearCache
