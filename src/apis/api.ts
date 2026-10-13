import Axios from 'axios'
import Router from 'next/router'
import { DetailThumbPage } from '@/interface/gallery'
import { readEhvSite, EhvSiteId } from '@/utils/sitePrefs'
export const axios = Axios.create({
  headers: { 'X-EHV-CSRF': '1' },
})

axios.interceptors.request.use((config) => {
  config.headers = config.headers || {}
  config.headers['X-EHV-Site'] = readEhvSite()
  return config
})

axios.interceptors.response.use((res) => {
  // not logged in, or exhentai rejected the cookies (sad panda)
  if (
    res.data.error &&
    (res.data.message?.includes('No login') || res.data.code === 'sad panda')
  ) {
    Router.replace('/signin')
  }
  return res
})

export type UserPayload = {
  UserName?: string
  PassWord?: string
  method?: 'cookie'
  ipb_member_id?: string
  ipb_pass_hash?: string
  igneous?: string
}
export async function login(payload: UserPayload) {
  return (
    await axios.post<{ error: boolean; message: string }>(
      '/api/user/login',
      payload
    )
  ).data
}

export interface loadImgRes {
  error: boolean
  url: string
  retryURL: string
}
export async function loadImg(url: string) {
  const res = await axios.get<loadImgRes>('/api/gallery/loadImg', {
    params: { url },
  })
  return res.data
}

export async function setting() {
  const res = await axios.post('/api/user/setting')
  return res.data
}

export async function loadMorePage(url: string) {
  const res = await axios.get<
    DetailThumbPage & { error: boolean; message?: string }
  >(url)
  if (res.data.error) throw new Error(res.data.message || 'load page failed')
  return res.data
}

export async function fetchSitePreference() {
  return (
    await axios.get<{
      error: boolean
      site: EhvSiteId
      requiresLogin: boolean
      sites: EhvSiteId[]
      envDefault: EhvSiteId
    }>('/api/user/site')
  ).data
}

export async function setSitePreference(site: EhvSiteId) {
  return (
    await axios.post<{
      error: boolean
      code?: string
      message: string
      site?: EhvSiteId
      requiresLogin?: boolean
    }>('/api/user/site', { site })
  ).data
}

export interface DownloadItem {
  id: string
  gid: string
  token: string
  title: string
  title_jpn: string
  thumb: string
  category: string
  filecount: number
  status: 'queued' | 'running' | 'complete' | 'error'
  done: number
  total: number
  error?: string | null
  createdAt?: number
  updatedAt?: number
  hasZip?: boolean
  files?: ({ ext: string; size: number } | null)[]
}

export async function fetchDownloads() {
  return (
    await axios.get<{ error: boolean; list: DownloadItem[] }>('/api/downloads')
  ).data
}

export async function fetchDownload(id: string) {
  return (
    await axios.get<{
      error: boolean
      download: DownloadItem
      message?: string
    }>(`/api/downloads/${id}`)
  ).data
}

export async function startDownload(gid: string, token: string) {
  return (
    await axios.post<{
      error: boolean
      download: DownloadItem
      message?: string
    }>('/api/downloads', { gid, token })
  ).data
}

export async function deleteDownload(id: string) {
  return (
    await axios.delete<{ error: boolean; removed?: boolean; message?: string }>(
      `/api/downloads/${id}`
    )
  ).data
}

export async function clearAllDownloads() {
  return (
    await axios.delete<{ error: boolean; removed: number }>('/api/downloads')
  ).data
}

export async function clearServerCache() {
  return (
    await axios.post<{ error: boolean; cleared: number; message: string }>(
      '/api/cache/clear'
    )
  ).data
}
