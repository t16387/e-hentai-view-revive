import {
  Box,
  Button,
  ButtonGroup,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  SelectProps,
  Slider,
  Switch,
  Typography,
} from '@mui/material'
import { useTranslation } from 'next-i18next'
import React, { useMemo } from 'react'
import { ComicConfigProps, useComicConfigState } from './ComicConfig'
import {
  DEFAULT_VERTICAL_MAX_WIDTH,
  DEFAULT_VERTICAL_WIDTH_PERCENT,
  normalizeVerticalSize,
  verticalReaderWidth,
} from './verticalSize'

/**
 * comic setting ui
 */
const ComicSettings: React.FC = () => {
  const [t] = useTranslation()
  const [config, setConfig] = useComicConfigState()

  const handleToggleButton: SelectProps['onChange'] = (event) => {
    setConfig((t) => {
      const direction = event.target.value as ComicConfigProps['direction']
      return { ...t, direction }
    })
  }

  const isVertical = config.direction === 'vertical'
  const size = normalizeVerticalSize(config)
  const effectiveWidth = useMemo(() => {
    if (typeof window === 'undefined') return size.maxWidth
    return verticalReaderWidth(config, window.innerWidth)
  }, [config, size.maxWidth])

  const widthPresets = [
    { label: '720', value: 720 },
    { label: '960', value: 960 },
    { label: '1280', value: DEFAULT_VERTICAL_MAX_WIDTH },
    { label: t('verticalPresetFit'), value: 4096 },
  ]

  const heightPresets = [
    { label: t('verticalMaxHeightOff'), value: 0 },
    { label: '80%', value: 80 },
    { label: '100%', value: 100 },
  ]

  return (
    <div>
      <List>
        <ListItem>
          <ListItemText>{t('Direction')}</ListItemText>
          <ListItemSecondaryAction>
            <Select
              value={config.direction}
              onChange={handleToggleButton}
              disableUnderline
              variant="standard"
            >
              <MenuItem value="ltr">{t('LTR')}</MenuItem>
              <MenuItem value="rtl">{t('RTL')}</MenuItem>
              <MenuItem value="vertical">{t('Vertical')}</MenuItem>
            </Select>
          </ListItemSecondaryAction>
        </ListItem>
        {!isVertical && (
          <ListItem>
            <ListItemText>{t('imgFit')}</ListItemText>
            <ListItemSecondaryAction>
              <Switch
                checked={config.imgFit}
                onChange={(e) =>
                  setConfig((t) => ({ ...t, imgFit: e.target.checked }))
                }
              />
            </ListItemSecondaryAction>
          </ListItem>
        )}
        {isVertical && (
          <>
            <ListItem
              sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }}
            >
              <ListItemText
                primary={t('verticalWidthPercent')}
                secondary={`${size.widthPercent}% · ~${Math.round(
                  effectiveWidth
                )}px`}
              />
              <Slider
                value={size.widthPercent}
                min={50}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                marks={[
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                onChange={(_, v) =>
                  setConfig((c) => ({
                    ...c,
                    verticalWidthPercent: v as number,
                  }))
                }
              />
              <Button
                size="small"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    verticalWidthPercent: DEFAULT_VERTICAL_WIDTH_PERCENT,
                  }))
                }
              >
                {t('verticalReset')}
              </Button>
            </ListItem>
            <ListItem
              sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }}
            >
              <ListItemText
                primary={t('verticalMaxWidth')}
                secondary={`${size.maxWidth}px`}
              />
              <Slider
                value={Math.min(size.maxWidth, 1920)}
                min={360}
                max={1920}
                step={40}
                valueLabelDisplay="auto"
                onChange={(_, v) =>
                  setConfig((c) => ({
                    ...c,
                    verticalMaxWidth: v as number,
                  }))
                }
              />
              <ButtonGroup size="small" variant="outlined" fullWidth>
                {widthPresets.map((p) => (
                  <Button
                    key={p.label}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        verticalMaxWidth: p.value,
                      }))
                    }
                    variant={
                      size.maxWidth === p.value ? 'contained' : 'outlined'
                    }
                  >
                    {p.label}
                  </Button>
                ))}
              </ButtonGroup>
            </ListItem>
            <ListItem
              sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }}
            >
              <ListItemText
                primary={t('verticalMaxHeight')}
                secondary={
                  size.maxHeightVh === 0
                    ? t('verticalMaxHeightOff')
                    : `${size.maxHeightVh}% ${t('verticalOfViewport')}`
                }
              />
              <Slider
                value={size.maxHeightVh}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                marks={[
                  { value: 0, label: t('verticalMaxHeightOff') },
                  { value: 100, label: '100%' },
                ]}
                onChange={(_, v) =>
                  setConfig((c) => ({
                    ...c,
                    verticalMaxHeightVh: v as number,
                  }))
                }
              />
              <Box display="flex" gap={1} flexWrap="wrap">
                {heightPresets.map((p) => (
                  <Button
                    key={p.label}
                    size="small"
                    variant={
                      size.maxHeightVh === p.value ? 'contained' : 'outlined'
                    }
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        verticalMaxHeightVh: p.value,
                      }))
                    }
                  >
                    {p.label}
                  </Button>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {t('verticalMaxHeightHint')}
              </Typography>
            </ListItem>
          </>
        )}
        <ListItem>
          <ListItemText>{t('imgDirect')}</ListItemText>
          <ListItemSecondaryAction>
            <Switch
              checked={config.imgDirect !== false}
              onChange={(e) =>
                setConfig((t) => ({ ...t, imgDirect: e.target.checked }))
              }
            />
          </ListItemSecondaryAction>
        </ListItem>
      </List>
    </div>
  )
}

export default ComicSettings
