import SlideUpDialog from '@/components/SlideUpDialog'
import message from '@/components/message'
import { axios, setSitePreference } from '@/apis'
import {
  DEFAULT_EHV_SITE,
  EHV_SITE_IDS,
  EhvSiteId,
  readEhvSite,
  writeEhvSite,
} from '@/utils/sitePrefs'
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
} from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { cache } from 'swr'

const SiteSelector = () => {
  const [t] = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [site, setSite] = useState<EhvSiteId>(DEFAULT_EHV_SITE)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSite(readEhvSite())
  }, [])

  const select = async (id: EhvSiteId) => {
    if (id === site || busy) return
    setBusy(true)
    try {
      if (id === 'exhentai') {
        // require login cookies before switching
        const res = await axios.get<{
          error: boolean
          cookies: Record<string, string>
        }>('/api/user/cookies')
        const c = (res.data && res.data.cookies) || {}
        if (!c.ipb_member_id || !c.ipb_pass_hash) {
          message.error(t('EhvSite.NeedLogin'))
          setBusy(false)
          setOpen(false)
          router.push('/signin')
          return
        }
        if (!c.igneous || c.igneous === 'mystery') {
          message.error(t('EhvSite.NeedIgneous'))
          setBusy(false)
          return
        }
      }
      const result = await setSitePreference(id)
      if (result.error) {
        message.error(result.message || t('EhvSite.SwitchFailed'))
        if (result.code === 'no login' || result.code === 'sad panda') {
          setOpen(false)
          router.push('/signin')
        }
        return
      }
      writeEhvSite(id)
      setSite(id)
      try {
        cache.clear()
      } catch (_) {
        /* swr optional */
      }
      message.success(result.message || t('EhvSite.' + id))
      setOpen(false)
    } catch (e) {
      message.error(t('EhvSite.SwitchFailed'))
    } finally {
      setBusy(false)
    }
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
          <LanguageIcon />
        </ListItemIcon>
        <ListItemText primary={t('EhvSite')} secondary={t('EhvSite.' + site)} />
      </ListItem>
      <SlideUpDialog open={open} onClose={() => setOpen(false)}>
        <List>
          {EHV_SITE_IDS.map((id) => (
            <ListItem
              button
              key={id}
              disabled={busy}
              onClick={() => select(id)}
            >
              <ListItemIcon>
                <Radio checked={site === id} />
              </ListItemIcon>
              <ListItemText
                primary={t(`EhvSite.${id}`)}
                secondary={t(`EhvSite.${id}.Hint`)}
              />
            </ListItem>
          ))}
        </List>
      </SlideUpDialog>
    </>
  )
}

export default SiteSelector
