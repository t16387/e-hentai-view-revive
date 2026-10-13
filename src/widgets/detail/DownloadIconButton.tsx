import LoadingIconButton from '@/components/LoadingButton'
import message from '@/components/message'
import { startDownload } from '@/apis'
import { IndexListItemPorps } from '@/interface/gallery'
import { ListItemIcon, ListItemText, MenuItem, Tooltip } from '@mui/material'
import GetAppIcon from '@mui/icons-material/GetApp'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { forwardRef, useState } from 'react'

interface DownloadIconButtonProps {
  info: IndexListItemPorps
  inMenu?: boolean
  onClick?: () => void
}

const DownloadIconButton = (
  { info, inMenu = false, onClick }: DownloadIconButtonProps,
  ref: React.ForwardedRef<HTMLLIElement>
) => {
  const [t] = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await startDownload(String(info.gid), String(info.token))
      if (res.error || !res.download) {
        message.error(t('Download.StartFailed'))
        return
      }
      message.success(t('Download.Started'))
      onClick?.()
      router.push('/downloads')
    } catch (e) {
      message.error(t('Download.StartFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (inMenu) {
    return (
      <MenuItem
        ref={ref}
        disabled={loading}
        onClick={() => {
          handle()
        }}
      >
        <ListItemIcon color="primary">
          <GetAppIcon />
        </ListItemIcon>
        <ListItemText primary={t('Download') as string} />
      </MenuItem>
    )
  }

  return (
    <Tooltip title={t('Download') as string}>
      <span>
        <LoadingIconButton
          loading={loading}
          color="primary"
          onClick={handle}
          aria-label={t('Download') as string}
        >
          <GetAppIcon />
        </LoadingIconButton>
      </span>
    </Tooltip>
  )
}

export default forwardRef(DownloadIconButton)
