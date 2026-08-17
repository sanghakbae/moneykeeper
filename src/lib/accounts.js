// 미리 만들어 둔 계정 목록.
//
// Firebase Auth 는 이메일/비밀번호만 받으므로 아이디에 도메인을 붙여 이메일로 쓴다.
// (로그인 화면에서는 아이디만 입력한다.)
// role 은 Firestore 가 아니라 이메일로 판정한다 — 클라이언트가 바꿀 수 없다.
// firestore.rules 의 isAdmin() 과 반드시 같은 목록을 유지할 것.

export const EMAIL_DOMAIN = 'moneykeeper.sanghak.kr'

export const ACCOUNTS = [
  { username: 'brpark', name: '엄마', emoji: '👩', role: 'user' },
  { username: 'shbae', name: '아빠', emoji: '👨', role: 'admin' },
  { username: 'hgbae', name: '아들', emoji: '🧑', role: 'user' },
]

export const ADMIN_USERNAMES = ACCOUNTS.filter((a) => a.role === 'admin').map((a) => a.username)

export function usernameToEmail(username) {
  return `${String(username || '').trim().toLowerCase()}@${EMAIL_DOMAIN}`
}

export function emailToUsername(email) {
  return String(email || '')
    .toLowerCase()
    .replace(`@${EMAIL_DOMAIN}`, '')
}

export function findAccount(username) {
  const u = String(username || '').trim().toLowerCase()
  return ACCOUNTS.find((a) => a.username === u) || null
}

export function isAdminUsername(username) {
  return ADMIN_USERNAMES.includes(String(username || '').toLowerCase())
}

export function displayName(username) {
  return findAccount(username)?.name || username
}
