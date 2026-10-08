const pkg = require('./package.json')
const {
  i18n: { defaultLocale, locales },
} = require('./next-i18next.config')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
const nextConfig = {
  // only the keys Next itself understands; strictMode/keySeparator are next-i18next options
  i18n: { defaultLocale, locales },

  env: {
    VERSION: pkg.version,
    BUILDTIME: pkg.buildTime,
  },
}

module.exports = withBundleAnalyzer(nextConfig)
