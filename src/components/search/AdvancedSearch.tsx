import { AiFilterMode, SEARCH_LANGUAGES, SearchFilters } from '@/utils/search'
import {
  Box,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

const useStyles = makeStyles((theme) =>
  createStyles({
    toggle: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      cursor: 'pointer',
      userSelect: 'none',
      marginBottom: theme.spacing(1),
      color: theme.palette.primary.main,
      minHeight: 44,
      padding: theme.spacing(0.5, 0),
      background: 'none',
      border: 0,
      font: 'inherit',
    },
    row: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(1, 2),
      marginBottom: theme.spacing(1),
      alignItems: 'center',
    },
    pages: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      flexWrap: 'wrap',
    },
    pageField: {
      width: 88,
    },
    select: {
      minWidth: 160,
    },
    body: {
      paddingBottom: theme.spacing(1),
    },
  })
)

export interface AdvancedSearchProps {
  value: SearchFilters
  onChange: (next: SearchFilters) => void
  /** start expanded when any advanced flag is set */
  defaultOpen?: boolean
  /**
   * `collapse` = inline expand/collapse (desktop / always-open sheet body).
   * `bare` = fields only (parent owns the drawer chrome).
   */
  variant?: 'collapse' | 'bare'
}

const AdvancedFields: React.FC<{
  value: SearchFilters
  set: (patch: Partial<SearchFilters>) => void
  classes: ReturnType<typeof useStyles>
  t: (k: string) => string
}> = ({ value, set, classes, t }) => {
  const numOrUndef = (raw: string) => {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }

  return (
    <Box className={classes.body}>
      <Box className={classes.row}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value.f_sh}
              onChange={(e) => set({ f_sh: e.target.checked || undefined })}
              size="small"
            />
          }
          label={t('Search.Expunged')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value.f_sto}
              onChange={(e) => set({ f_sto: e.target.checked || undefined })}
              size="small"
            />
          }
          label={t('Search.RequireTorrent')}
        />
      </Box>
      <Box className={classes.row}>
        <span className={classes.pages}>
          {t('Search.Between')}
          <TextField
            className={classes.pageField}
            size="small"
            type="number"
            inputProps={{ min: 1, max: 9999 }}
            value={value.f_spf ?? ''}
            onChange={(e) => set({ f_spf: numOrUndef(e.target.value) })}
          />
          {t('Search.And')}
          <TextField
            className={classes.pageField}
            size="small"
            type="number"
            inputProps={{ min: 1, max: 9999 }}
            value={value.f_spt ?? ''}
            onChange={(e) => set({ f_spt: numOrUndef(e.target.value) })}
          />
          {t('Search.Pages')}
        </span>
      </Box>
      <Box className={classes.row}>
        <FormControl size="small" className={classes.select}>
          <InputLabel id="ehv-min-rating">{t('Search.MinRating')}</InputLabel>
          <Select
            labelId="ehv-min-rating"
            label={t('Search.MinRating')}
            value={value.f_srdd ?? 0}
            onChange={(e) => {
              const n = Number(e.target.value)
              set({ f_srdd: n >= 2 ? n : undefined })
            }}
          >
            <MenuItem value={0}>{t('Search.AnyRating')}</MenuItem>
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={4}>4</MenuItem>
            <MenuItem value={5}>5</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" className={classes.select}>
          <InputLabel id="ehv-lang">{t('Language')}</InputLabel>
          <Select
            labelId="ehv-lang"
            label={t('Language')}
            value={value.language || ''}
            onChange={(e) =>
              set({ language: (e.target.value as string) || undefined })
            }
          >
            {SEARCH_LANGUAGES.map((l) => (
              <MenuItem key={l || 'any'} value={l}>
                {l ? l : t('Search.AnyLanguage')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box className={classes.row}>
        <FormControl size="small" className={classes.select}>
          <InputLabel id="ehv-ai-filter">{t('Search.AiFilter')}</InputLabel>
          <Select
            labelId="ehv-ai-filter"
            label={t('Search.AiFilter')}
            value={value.ai || 'any'}
            onChange={(e) => {
              const v = e.target.value as AiFilterMode
              set({ ai: v === 'any' ? undefined : v })
            }}
          >
            <MenuItem value="any">{t('Search.AiAny')}</MenuItem>
            <MenuItem value="exclude">{t('Search.AiExclude')}</MenuItem>
            <MenuItem value="only">{t('Search.AiOnly')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Typography variant="caption" color="textSecondary">
        {t('Search.DisableFilters')}
      </Typography>
      <Box className={classes.row}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value.f_sfl}
              onChange={(e) => set({ f_sfl: e.target.checked || undefined })}
              size="small"
            />
          }
          label={t('Language')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value.f_sfu}
              onChange={(e) => set({ f_sfu: e.target.checked || undefined })}
              size="small"
            />
          }
          label={t('Search.Uploader')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value.f_sft}
              onChange={(e) => set({ f_sft: e.target.checked || undefined })}
              size="small"
            />
          }
          label={t('Search.Tags')}
        />
      </Box>
    </Box>
  )
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  value,
  onChange,
  defaultOpen,
  variant = 'collapse',
}) => {
  const classes = useStyles()
  const [t] = useTranslation()
  const autoOpen = !!(
    value.f_sh ||
    value.f_sto ||
    value.f_srdd ||
    value.f_spf ||
    value.f_spt ||
    value.f_sfl ||
    value.f_sfu ||
    value.f_sft ||
    value.language ||
    (value.ai && value.ai !== 'any')
  )
  const [open, setOpen] = useState(defaultOpen ?? autoOpen)

  const set = (patch: Partial<SearchFilters>) =>
    onChange({ ...value, ...patch })

  if (variant === 'bare') {
    return <AdvancedFields value={value} set={set} classes={classes} t={t} />
  }

  return (
    <Box>
      <Typography
        variant="body2"
        className={classes.toggle}
        onClick={() => setOpen((o) => !o)}
        component="button"
        type="button"
      >
        {open ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
        {open ? t('Search.HideAdvanced') : t('Search.ShowAdvanced')}
      </Typography>
      <Collapse in={open}>
        <AdvancedFields value={value} set={set} classes={classes} t={t} />
      </Collapse>
    </Box>
  )
}

export default AdvancedSearch
