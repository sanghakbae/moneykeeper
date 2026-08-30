// iOS 확대 회귀 방지.
//
// iOS 사파리는 글자 크기가 16px 미만인 input/select/textarea 에 포커스가 가면
// 화면을 통째로 확대한다. 모바일 글자 크기를 정리하다 입력칸이 딸려 내려가는 일이
// 잦아서, 여기서 고정한다.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const MIN_INPUT_FONT_PX = 16

/** 셀렉터 + 선언 블록 쌍을 뽑는다(@media 등 중첩 블록의 껍데기는 걸러진다). */
function rules(source) {
  const out = []
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].replace(/\/\*[\s\S]*?\*\//g, '').trim()
    const body = match[2]
    if (!selector || selector.startsWith('@')) continue
    out.push({ selector: selector.split(/\s+/).join(' '), body })
  }
  return out
}

const isInputSelector = (selector) =>
  /(^|[\s,>+~])(input|select|textarea)\b/.test(selector) ||
  /\b(input|select|textarea)[.#:[]/.test(selector)

test('--input-font 토큰이 16px 이상이다', () => {
  const match = css.match(/--input-font:\s*(\d+(?:\.\d+)?)px/)
  assert.ok(match, '--input-font 토큰이 있어야 한다')
  assert.ok(
    Number(match[1]) >= MIN_INPUT_FONT_PX,
    `--input-font 는 ${MIN_INPUT_FONT_PX}px 이상이어야 한다 (현재 ${match[1]}px)`,
  )
})

test('입력칸 글자 크기를 16px 아래로 내린 규칙이 없다', () => {
  const offenders = []
  for (const { selector, body } of rules(css)) {
    if (!isInputSelector(selector)) continue
    for (const decl of body.matchAll(/font-size:\s*([^;]+);/g)) {
      const value = decl[1].trim()
      if (value.startsWith('var(')) continue
      const px = value.match(/^(\d+(?:\.\d+)?)px$/)
      if (!px) {
        offenders.push(`${selector} → ${value} (px 또는 var(--input-font) 만 허용)`)
      } else if (Number(px[1]) < MIN_INPUT_FONT_PX) {
        offenders.push(`${selector} → ${value}`)
      }
    }
  }
  assert.deepEqual(offenders, [], `16px 미만 입력칸:\n  ${offenders.join('\n  ')}`)
})

test('입력 요소 기본 규칙이 토큰을 쓴다', () => {
  const base = rules(css).find(
    (r) => r.selector === 'input, select, textarea' && /font-size/.test(r.body),
  )
  assert.ok(base, 'input/select/textarea 공통 font-size 규칙이 있어야 한다')
  assert.match(base.body, /font-size:\s*var\(--input-font\)/)
})

test('viewport 가 확대를 막지 않는다', () => {
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)
  assert.ok(viewport, 'viewport 메타 태그가 있어야 한다')
  const content = viewport[1]
  assert.doesNotMatch(content, /user-scalable\s*=\s*no/, 'user-scalable=no 는 쓰지 않는다')
  assert.doesNotMatch(content, /maximum-scale/, 'maximum-scale 로 확대를 막지 않는다')
  assert.match(content, /width=device-width/)
})

test('PWA 에 필요한 태그가 index.html 에 있다', () => {
  assert.match(html, /<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"/)
  assert.match(html, /<link\s+rel="apple-touch-icon"/)
  assert.match(html, /<meta\s+name="theme-color"\s+content="#2a78d6"/)
  assert.match(html, /apple-mobile-web-app-title"\s+content="머니키퍼"/)
})
