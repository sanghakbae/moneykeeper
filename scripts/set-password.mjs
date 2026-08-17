#!/usr/bin/env node
// 계정 비밀번호 변경.
//
//   MK_USERNAME=shbae OLD_PASSWORD='...' NEW_PASSWORD='...' npm run set-password
//
// 비밀번호를 저장소에 남기지 않으려고 전부 환경변수로 받는다.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const env = { ...process.env }
try {
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !env[match[1]]) env[match[1]] = match[2].trim()
  }
} catch {
  /* .env 없으면 실제 환경변수만 쓴다 */
}

const apiKey = env.VITE_FIREBASE_API_KEY
// USERNAME 은 셸이 이미 쓰는 이름이라 덮어써지지 않는다 — MK_USERNAME 을 쓴다.
const { MK_USERNAME, OLD_PASSWORD, NEW_PASSWORD } = env

if (!apiKey) {
  console.error('VITE_FIREBASE_API_KEY 가 없습니다 (.env 확인).')
  process.exit(1)
}
if (!MK_USERNAME || !OLD_PASSWORD || !NEW_PASSWORD) {
  console.error("MK_USERNAME / OLD_PASSWORD / NEW_PASSWORD 를 모두 지정해주세요.")
  process.exit(1)
}
if (NEW_PASSWORD.length < 6) {
  console.error('새 비밀번호는 6자 이상이어야 합니다.')
  process.exit(1)
}

const email = `${MK_USERNAME}@moneykeeper.sanghak.kr`

const call = async (method, body) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  return { ok: res.ok, data: await res.json() }
}

const signIn = await call('signInWithPassword', {
  email,
  password: OLD_PASSWORD,
  returnSecureToken: true,
})
if (!signIn.ok) {
  console.error(`✘ 현재 비밀번호로 로그인하지 못했습니다: ${signIn.data?.error?.message}`)
  process.exit(1)
}

const update = await call('update', {
  idToken: signIn.data.idToken,
  password: NEW_PASSWORD,
  returnSecureToken: false,
})
if (!update.ok) {
  console.error(`✘ 변경 실패: ${update.data?.error?.message}`)
  process.exit(1)
}

const verify = await call('signInWithPassword', {
  email,
  password: NEW_PASSWORD,
  returnSecureToken: false,
})
console.log(
  verify.ok
    ? `✔ ${MK_USERNAME} 비밀번호를 바꿨습니다 (새 비밀번호로 로그인 확인)`
    : `! ${MK_USERNAME} 변경은 됐지만 새 비밀번호 로그인 확인에 실패했습니다`,
)
process.exit(verify.ok ? 0 : 1)
