import ColorChip from '@/components/ColorChip'
import {
  CAT_KEYS,
  CAT_LABEL,
  CatKey,
  isCatIncluded,
  toggleCatIncluded,
} from '@/utils/search'
import { Box, Button, ButtonGroup } from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { useTranslation } from 'next-i18next'
import React from 'react'

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(0.75),
      marginBottom: theme.spacing(1),
    },
    chip: {
      cursor: 'pointer',
      opacity: 1,
    },
    off: {
      opacity: 0.35,
      filter: 'grayscale(0.6)',
    },
    actions: {
      marginBottom: theme.spacing(1),
    },
  })
)

export interface CategoryChipsProps {
  included: number
  onChange: (included: number) => void
  showActions?: boolean
  variant?: 'deck' | 'compact'
}

const CategoryChipsClassic: React.FC<CategoryChipsProps> = ({
  included,
  onChange,
  showActions = true,
}) => {
  const classes = useStyles()
  const [t] = useTranslation()

  const toggle = (key: CatKey) => {
    onChange(toggleCatIncluded(included, key))
  }

  return (
    <Box data-cat-row="ehv-classic">
      {showActions && (
        <ButtonGroup size="small" className={classes.actions}>
          <Button onClick={() => onChange(1023)}>{t('Search.CatAll')}</Button>
          <Button onClick={() => onChange(0)}>{t('Search.CatNone')}</Button>
        </ButtonGroup>
      )}
      <Box
        className={classes.root}
        role="group"
        aria-label={t('Search.Categories') as string}
      >
        {CAT_KEYS.map((key) => {
          const on = isCatIncluded(included, key)
          return (
            <ColorChip
              key={key}
              label={CAT_LABEL[key]}
              size="small"
              className={`${classes.chip}${on ? '' : ` ${classes.off}`}`}
              onClick={() => toggle(key)}
              aria-pressed={on}
              data-cat={key}
              data-included={on ? '1' : '0'}
            />
          )
        })}
      </Box>
    </Box>
  )
}

export default CategoryChipsClassic
