import { describe, expect, it } from 'vitest'
import { DEFAULT_ASPECT } from '@/widgets/comic/paging'
import {
  DEFAULT_VERTICAL_MAX_HEIGHT_VH,
  DEFAULT_VERTICAL_MAX_WIDTH,
  DEFAULT_VERTICAL_WIDTH_PERCENT,
  normalizeVerticalSize,
  verticalItemDims,
  verticalPrefixOffsets,
  verticalReaderMaxHeight,
  verticalReaderWidth,
} from '@/widgets/comic/verticalSize'
import { mergeComicConfig } from '@/widgets/comic/ComicConfig'

describe('normalizeVerticalSize / migration', () => {
  it('defaults match historical behaviour', () => {
    expect(normalizeVerticalSize({})).toEqual({
      maxWidth: DEFAULT_VERTICAL_MAX_WIDTH,
      widthPercent: DEFAULT_VERTICAL_WIDTH_PERCENT,
      maxHeightVh: DEFAULT_VERTICAL_MAX_HEIGHT_VH,
    })
  })

  it('fills missing fields from an old localStorage payload', () => {
    const merged = mergeComicConfig({
      direction: 'vertical',
      imgFit: true,
      imgDirect: true,
    })
    expect(merged.verticalMaxWidth).toBe(1280)
    expect(merged.verticalWidthPercent).toBe(100)
    expect(merged.verticalMaxHeightVh).toBe(0)
  })

  it('clamps out-of-range values', () => {
    expect(
      normalizeVerticalSize({
        verticalMaxWidth: 10,
        verticalWidthPercent: 200,
        verticalMaxHeightVh: -5,
      })
    ).toEqual({ maxWidth: 320, widthPercent: 100, maxHeightVh: 0 })
  })
})

describe('verticalReaderWidth', () => {
  it('caps at maxWidth and applies percent of viewport', () => {
    expect(
      verticalReaderWidth(
        { verticalMaxWidth: 1280, verticalWidthPercent: 100 },
        400
      )
    ).toBe(400)
    expect(
      verticalReaderWidth(
        { verticalMaxWidth: 1280, verticalWidthPercent: 100 },
        1920
      )
    ).toBe(1280)
    expect(
      verticalReaderWidth(
        { verticalMaxWidth: 1280, verticalWidthPercent: 80 },
        400
      )
    ).toBe(320)
  })
})

describe('verticalReaderMaxHeight', () => {
  it('0 means unlimited', () => {
    expect(verticalReaderMaxHeight({ verticalMaxHeightVh: 0 }, 800)).toBe(0)
  })
  it('converts vh percent to pixels', () => {
    expect(verticalReaderMaxHeight({ verticalMaxHeightVh: 100 }, 800)).toBe(800)
    expect(verticalReaderMaxHeight({ verticalMaxHeightVh: 50 }, 800)).toBe(400)
  })
})

describe('verticalItemDims / offsets', () => {
  it('keeps natural size when under the height cap', () => {
    // square at width 400 → height 400
    expect(verticalItemDims(1, 400, 500)).toEqual({ width: 400, height: 400 })
  })

  it('shrinks width when height would exceed the cap', () => {
    // aspect 0.5 → natural height 800 at width 400; cap 400 → width 200
    expect(verticalItemDims(0.5, 400, 400)).toEqual({
      width: 200,
      height: 400,
    })
  })

  it('uses default aspect for holes', () => {
    const { height } = verticalItemDims(undefined, 1000, 0)
    expect(height).toBeCloseTo(1000 / DEFAULT_ASPECT)
  })

  it('prefix offsets honour the height cap', () => {
    const list = [
      { index: 0, url: 'a', thumb: '', aspectratio: 0.5 },
      { index: 1, url: 'b', thumb: '', aspectratio: 0.5 },
    ] as any
    const offsets = verticalPrefixOffsets(list, 400, 400)
    expect(offsets[0]).toBe(0)
    expect(offsets[1]).toBe(400)
    expect(offsets[2]).toBe(800)
  })
})
