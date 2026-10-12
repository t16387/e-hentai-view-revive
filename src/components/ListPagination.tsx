import ListPaginationClassic from '@/components/listPagination/Classic'
import ListPaginationV3 from '@/components/listPagination/V3'
import ListPaginationV4 from '@/components/listPagination/V4'
import { useUiTheme } from '@/theme'
import React from 'react'

export type { ListPaginationProps } from '@/components/listPagination/V4'

import type { ListPaginationProps } from '@/components/listPagination/V4'

const ListPagination: React.FC<ListPaginationProps> = (props) => {
  const uiTheme = useUiTheme()
  if (uiTheme === 'classic') return <ListPaginationClassic {...props} />
  if (uiTheme === 'v3') return <ListPaginationV3 {...props} />
  return <ListPaginationV4 {...props} />
}

export default ListPagination
