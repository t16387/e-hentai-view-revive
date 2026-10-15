import { axios } from '@/apis'
import { Detailpage } from '@/interface/gallery'
import useSWR from 'swr'

export default function useGallery({ url }: { [k: string]: string }) {
  // Key includes gid/token so comment-link navigation refetches cleanly.
  const res = useSWR(
    url ? '/api/gallery' + url : null,
    async (reqUrl: string) => {
      const res = await axios.get<Detailpage>(reqUrl)
      if (res.data.error) throw new Error('error')
      return res.data
    },
    {
      errorRetryInterval: 2000,
      errorRetryCount: 3,
      // Avoid flashing stale gallery when hopping via comment links.
      revalidateOnFocus: false,
    }
  )

  return res
}
