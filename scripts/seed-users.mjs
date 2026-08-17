#!/usr/bin/env node
// 가족 계정 3개를 Firebase Auth 에 만든다. 이미 있으면 건너뛴다.
//
//   SEED_PASSWORD='...' npm run seed
//
// 비밀번호를 저장소에 남기지 않으려고 환경변수로 받는다.
// 사전 준비: Firebase 콘솔 → Authentication → Sign-in method → 이메일/비밀번호 사용 설정.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = { ...process.env }
  try {
    for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !env[match[1]]) env[match[1]] = match[2].trim()
    }
  } catch {
    /* .env 가 없으면 실제 환경변수만 쓴다 */
  }
  return env
}

const env = loadEnv()
const apiKey = env.VITE_FIREBASE_API_KEY
const password = env.SEED_PASSWORD

if (!apiKey) {
  console.error('VITE_FIREBASE_API_KEY 가 없습니다 (.env 확인).')
  process.exit(1)
}
if (!password) {
  console.error("SEED_PASSWORD 를 지정해주세요.  예)  SEED_PASSWORD='...' npm run seed")
  process.exit(1)
}

const DOMAIN = 'moneykeeper.sanghak.kr'
const USERNAMES = ['brpark', 'shbae', 'hgbae']

const endpoint = (method) =>
  `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`

async function call(method, body) {
  const response = await fetch(endpoint(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: response.ok, data: await response.json() }
}

let failed = false

for (const username of USERNAMES) {
  const email = `${username}@${DOMAIN}`
  const { ok, data } = await call('signUp', { email, password, returnSecureToken: false })

  if (ok) {
    console.log(`✔ ${username} 생성됨`)
    continue
  }

  const message = data?.error?.message || 'UNKNOWN'
  if (message.startsWith('EMAIL_EXISTS')) {
    const check = await call('signInWithPassword', { email, password, returnSecureToken: false })
    console.log(
      check.ok
        ? `· ${username} 이미 있음 (비밀번호 일치)`
        : `! ${username} 이미 있으나 비밀번호가 다릅니다 — 콘솔에서 재설정하세요`,
    )
    if (!check.ok) failed = true
    continue
  }

  failed = true
  if (message.startsWith('OPERATION_NOT_ALLOWED')) {
    console.error(
      `✘ ${username}: 이메일/비밀번호 로그인이 꺼져 있습니다.\n` +
        `  https://console.firebase.google.com/project/${env.VITE_FIREBASE_PROJECT_ID}/authentication/providers`,
    )
  } else {
    console.error(`✘ ${username}: ${message}`)
  }
}

process.exit(failed ? 1 : 0)
