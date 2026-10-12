import CategoryChipsClassic from '@/components/search/categoryChips/Classic'
import CategoryChipsV3 from '@/components/search/categoryChips/V3'
import CategoryChipsV4 from '@/components/search/categoryChips/V4'
import { useUiTheme } from '@/theme'
import React from 'react'

export type { CategoryChipsProps } from '@/components/search/categoryChips/V4'
import type { CategoryChipsProps } from '@/components/search/categoryChips/V4'

const CategoryChips: React.FC<CategoryChipsProps> = (props) => {
  const uiTheme = useUiTheme()
  if (uiTheme === 'classic') return <CategoryChipsClassic {...props} />
  if (uiTheme === 'v3') return <CategoryChipsV3 {...props} />
  return <CategoryChipsV4 {...props} />
}

export default CategoryChips
