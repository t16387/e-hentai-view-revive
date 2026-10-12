import SearchFilterBarClassic from '@/components/search/searchFilterBar/Classic'
import SearchFilterBarV3 from '@/components/search/searchFilterBar/V3'
import SearchFilterBarV4 from '@/components/search/searchFilterBar/V4'
import { useUiTheme } from '@/theme'
import React from 'react'

export type { SearchFilterBarProps } from '@/components/search/searchFilterBar/V4'
import type { SearchFilterBarProps } from '@/components/search/searchFilterBar/V4'

const SearchFilterBar: React.FC<SearchFilterBarProps> = (props) => {
  const uiTheme = useUiTheme()
  if (uiTheme === 'classic') return <SearchFilterBarClassic {...props} />
  if (uiTheme === 'v3') return <SearchFilterBarV3 {...props} />
  return <SearchFilterBarV4 {...props} />
}

export default SearchFilterBar
