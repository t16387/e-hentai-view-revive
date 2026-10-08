import { ThumbSprite } from '@/interface/gallery'
import React, { useEffect, useRef, useState } from 'react'
import { proxyUrl } from './ProxyImg'

interface ThumbProps {
  src: string
  sprite: ThumbSprite
  className?: string
  /** largest rendered width, defaults to the sprite cell width x 1.5 */
  maxWidth?: number
}

/**
 * One cell of a thumbnail sprite sheet (2024+ #gdt markup), scaled to the
 * available width while keeping its aspect ratio.
 */
const Thumb: React.FC<ThumbProps> = ({ src, sprite, className, maxWidth }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const limit = maxWidth ?? sprite.width * 1.5
  const shown = Math.min(width || sprite.width, limit)
  const scale = sprite.width ? shown / sprite.width : 1

  return (
    <div ref={ref} className={className} style={{ width: '100%' }}>
      <div
        style={{
          width: shown,
          height: sprite.height * scale,
          margin: '0 auto',
          overflow: 'hidden',
        }}
      >
        <div
          role="img"
          style={{
            width: sprite.width,
            height: sprite.height,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            background: `transparent url("${proxyUrl(src)}") -${sprite.x}px -${
              sprite.y
            }px no-repeat`,
          }}
        />
      </div>
    </div>
  )
}

export default Thumb
