import message from '@/components/message'
import { clearAllDownloads } from '@/apis'
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Button,
  CircularProgress,
} from '@mui/material'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

const ClearDownloads = () => {
  const [t] = useTranslation()
  const [busy, setBusy] = useState(false)

  const handle = async () => {
    if (busy) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(t('Download.ClearAll.Confirm') as string)
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await clearAllDownloads()
      if (res.error) {
        message.error(t('Download.ClearAllFailed'))
      } else {
        message.success(t('Download.ClearedAll', { count: res.removed || 0 }))
      }
    } catch (e) {
      message.error(t('Download.ClearAllFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ListItem>
      <ListItemIcon>
        <DeleteSweepIcon />
      </ListItemIcon>
      <ListItemText
        primary={t('Download.ClearAll')}
        secondary={t('Download.ClearAll.Hint')}
      />
      <ListItemSecondaryAction>
        <Button
          size="small"
          color="secondary"
          variant="outlined"
          onClick={handle}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
        >
          {t('Download.ClearAll')}
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default ClearDownloads
