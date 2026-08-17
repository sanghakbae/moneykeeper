export function formatWon(n) {
  return `${Math.round(n || 0).toLocaleString('ko-KR')}원`
}

export function formatNumber(n) {
  return Math.round(n || 0).toLocaleString('ko-KR')
}

/** 축 눈금용 압축 표기 — 12,000 → 1.2만, 3,400,000 → 340만 */
export function compactWon(n) {
  const v = Math.round(n || 0)
  if (v === 0) return '0'
  const abs = Math.abs(v)
  if (abs >= 100000000) return `${trim(v / 100000000)}억`
  if (abs >= 10000) return `${trim(v / 10000)}만`
  if (abs >= 1000) return `${trim(v / 1000)}천`
  return String(v)
}

function trim(x) {
  const r = Math.round(x * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

export function todayISO(now = new Date()) {
  const tz = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return tz.toISOString().slice(0, 10)
}

export function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${m}월 ${d}일 (${week})`
}
