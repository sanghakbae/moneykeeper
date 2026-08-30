#!/usr/bin/env node
// 빌드 결과물(dist)을 훑어 서비스워커를 만든다.
//
// 해시가 붙은 파일명을 빌드 전에는 알 수 없으므로, vite build 뒤에 실행한다.
// 프리캐시 목록과 버전(내용 해시)을 sw.js 에 박아 넣는다 —
// 내용이 바뀌면 버전이 바뀌고, 브라우저가 새 서비스워커로 인식한다.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, sep } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// 앱 껍데기 + 아이콘만 미리 받는다. 지출 데이터는 Firestore 가 자체 캐시로 관리한다.
const PRECACHE_MATCH = /\.(js|css|html|png|svg|webmanifest|woff2?)$/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(dist)
  .map((f) => `/${relative(dist, f).split(sep).join('/')}`)
  .filter((f) => PRECACHE_MATCH.test(f))
  .filter((f) => f !== '/sw.js' && f !== '/404.html')
  .sort()

const hash = createHash('sha256')
for (const file of files) {
  hash.update(file)
  hash.update(readFileSync(join(dist, file.slice(1))))
}
const version = hash.digest('hex').slice(0, 12)

const sw = `// 자동 생성 파일 — scripts/build-sw.mjs 가 만든다. 직접 고치지 말 것.
const VERSION = '${version}'
const CACHE = 'moneykeeper-' + VERSION
const PRECACHE = ${JSON.stringify(files, null, 2)}

// 설치 즉시 활성화하지 않는다. 사용자가 '업데이트' 를 눌러야 교체된다 —
// 작성 중이던 입력을 날리지 않기 위해서다.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key.startsWith('moneykeeper-') && key !== CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

// 페이지가 눌러 준 뒤에만 교체한다.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data && event.data.type === 'VERSION') {
    event.source && event.source.postMessage({ type: 'VERSION', version: VERSION })
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Firestore 등 외부 요청은 건드리지 않는다

  // ignoreVary 가 중요하다. <script type="module"> 은 same-origin 이어도 CORS 모드로
  // 요청돼 Origin 헤더가 붙는데, 서버가 'Vary: Origin' 을 보내면 프리캐시해 둔 응답과
  // 헤더가 달라 매칭에 실패한다. 그러면 오프라인에서 화면이 비어 버린다.
  const fromCache = (req) => caches.match(req, { ignoreVary: true })

  // 화면 이동은 네트워크 우선, 실패하면 캐시된 앱 껍데기로 —
  // 비행기 모드에서도 앱이 열린다.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put('/index.html', response.clone())
          return response
        } catch {
          return (await fromCache('/index.html')) || Response.error()
        }
      })(),
    )
    return
  }

  // 해시가 붙은 정적 자원은 캐시 우선.
  event.respondWith(
    (async () => {
      const hit = await fromCache(request)
      if (hit) return hit
      try {
        const response = await fetch(request)
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone())
        }
        return response
      } catch {
        return (await fromCache(request)) || Response.error()
      }
    })(),
  )
})
`

writeFileSync(join(dist, 'sw.js'), sw)
console.log(`✔ dist/sw.js — 버전 ${version}, 프리캐시 ${files.length}개`)
for (const f of files) console.log(`  ${f}`)
