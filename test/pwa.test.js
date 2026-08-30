// iOS 홈 화면 안내 노출 규칙.
// 한 번 닫으면 하루 동안 다시 뜨지 않아야 한다.

import test from 'node:test'
import assert from 'node:assert/strict'

const DAY = 24 * 60 * 60 * 1000

const define = (name, value) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })

function stubBrowser({ ua, standalone = false, store = new Map(), platform = 'iPhone', touch = 5 }) {
  // Node 26 의 globalThis.navigator 는 getter 라서 대입이 안 된다.
  define('navigator', { userAgent: ua, platform, maxTouchPoints: touch, standalone })
  define('window', {
    matchMedia: () => ({ matches: false }),
    navigator: globalThis.navigator,
    addEventListener() {},
  })
  define('document', { readyState: 'complete', addEventListener() {} })
  define('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
  })
  return store
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120'

async function loadPwa() {
  // 모듈 상태(localStorage 등)를 매번 새로 읽도록 캐시를 우회한다
  return import(`../src/lib/pwa.js?t=${Math.random()}`)
}

test('아이폰에서는 안내가 뜬다', async () => {
  stubBrowser({ ua: IPHONE })
  const { shouldShowIosHint, isIos } = await loadPwa()
  assert.equal(isIos(), true)
  assert.equal(shouldShowIosHint(), true)
})

test('안드로이드에서는 안내가 뜨지 않는다', async () => {
  stubBrowser({ ua: ANDROID, platform: 'Linux armv8l', touch: 5 })
  const { shouldShowIosHint, isIos } = await loadPwa()
  assert.equal(isIos(), false)
  assert.equal(shouldShowIosHint(), false)
})

test('이미 홈 화면에서 실행 중이면 안내하지 않는다', async () => {
  stubBrowser({ ua: IPHONE, standalone: true })
  const { shouldShowIosHint } = await loadPwa()
  assert.equal(shouldShowIosHint(), false)
})

test('닫으면 하루 동안 다시 뜨지 않는다', async () => {
  stubBrowser({ ua: IPHONE })
  const { shouldShowIosHint, dismissIosHint } = await loadPwa()
  const now = 1_700_000_000_000

  assert.equal(shouldShowIosHint(now), true)
  dismissIosHint(now)

  assert.equal(shouldShowIosHint(now), false, '닫은 직후')
  assert.equal(shouldShowIosHint(now + DAY - 1000), false, '23시간 59분 뒤')
  assert.equal(shouldShowIosHint(now + DAY + 1000), true, '하루가 지난 뒤')
})

test('localStorage 가 막혀 있어도 터지지 않는다', async () => {
  stubBrowser({ ua: IPHONE })
  define('localStorage', {
    getItem() { throw new Error('보안 정책으로 차단됨') },
    setItem() { throw new Error('보안 정책으로 차단됨') },
  })
  const { shouldShowIosHint, dismissIosHint } = await loadPwa()
  assert.equal(shouldShowIosHint(), true)
  assert.doesNotThrow(() => dismissIosHint())
})

test('iPadOS 는 데스크톱으로 위장해도 잡아낸다', async () => {
  stubBrowser({
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    platform: 'MacIntel',
    touch: 5,
  })
  const { isIos } = await loadPwa()
  assert.equal(isIos(), true)
})
