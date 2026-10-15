import { Alert, Box } from '@mui/material'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'

function isLoopbackHost(hostname: string): boolean {
  const h = (hostname || '').toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    h === '::1' ||
    h.endsWith('.localhost')
  )
}

/**
 * When the app is opened via a LAN IP (phone/tablet), show a short tip.
 * Hidden on localhost / 127.0.0.1 so desktop local use stays quiet.
 */
const LanAccessHint: React.FC = () => {
  const [t] = useTranslation()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    try {
      const { hostname, origin } = window.location
      if (!hostname || isLoopbackHost(hostname)) {
        setUrl(null)
        return
      }
      setUrl(origin)
    } catch (_) {
      setUrl(null)
    }
  }, [])

  if (!url) return null

  return (
    <Box m="0 0 16px 0">
      <Alert severity="info">{t('SignIn.LanAccessHint', { url })}</Alert>
    </Box>
  )
}

export default LanAccessHint
