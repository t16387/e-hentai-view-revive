// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeCommentHtml } from '@/utils/sanitizeCommentHtml'

describe('sanitizeCommentHtml (client)', () => {
  it('keeps gallery anchors for in-app rewrite and strips XSS', () => {
    const html =
      'see <a href="https://exhentai.org/g/1/aaaaaaaaaa/">g</a>' +
      '<script>alert(1)</script><a href="javascript:alert(1)">bad</a>'
    const out = sanitizeCommentHtml(html)
    expect(out).toContain('href="https://exhentai.org/g/1/aaaaaaaaaa/"')
    expect(out).not.toMatch(/script|javascript:/i)
  })
})
