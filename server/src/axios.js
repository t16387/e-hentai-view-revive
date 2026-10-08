const Axios = require('axios').default

/**
 * Optional outbound proxy for requests to e-hentai / exhentai.
 * Off by default. Set EHV_PROXY=http://host:port to route all upstream
 * traffic through an HTTP(S) proxy. (axios still honours the standard
 * HTTP_PROXY / HTTPS_PROXY env vars on its own when EHV_PROXY is unset.)
 */
const proxyUrl = process.env.EHV_PROXY

function proxyOptions() {
  if (!proxyUrl) return {}
  const { HttpProxyAgent } = require('http-proxy-agent')
  const { HttpsProxyAgent } = require('https-proxy-agent')
  return {
    httpAgent: new HttpProxyAgent(proxyUrl),
    httpsAgent: new HttpsProxyAgent(proxyUrl),
    proxy: false,
  }
}

const axios = Axios.create({
  headers: {
    'User-Agent':
      process.env.EHV_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  },
  maxRedirects: 2,
  ...proxyOptions(),
})
module.exports = axios
