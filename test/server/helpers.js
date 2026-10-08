import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')

export function fixture(name) {
  return readFileSync(
    fileURLToPath(new URL('../fixtures/' + name, import.meta.url)),
    'utf8'
  )
}
export function doc(name) {
  return new JSDOM(fixture(name)).window.document
}
