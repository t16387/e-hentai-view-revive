import { ImgHTMLAttributes, forwardRef, useMemo } from 'react'

/** route remote (site / H@H) images through the server's image proxy */
export function proxyUrl(src?: string) {
  if (!src) return ''
  if (!src.startsWith('http')) return src
  return '/api/gallery/proxy?url=' + encodeURIComponent(src)
}

const ProxyImg = forwardRef<
  HTMLImageElement,
  ImgHTMLAttributes<HTMLImageElement>
>((props, ref) => {
  const { src, alt, ...rest } = props

  const finalSrc = useMemo(() => proxyUrl(src), [src])

  return <img ref={ref} {...rest} src={finalSrc} alt={alt} />
})

ProxyImg.displayName = 'ProxyImg'

export default ProxyImg
