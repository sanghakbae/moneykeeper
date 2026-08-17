// 기간 단위(일/월/분기/반기/연) 버킷 계산. 순수 함수라 node --test 로 검증한다.

export const GRANULARITIES = [
  { id: 'day', label: '일별', count: 14 },
  { id: 'month', label: '월별', count: 12 },
  { id: 'quarter', label: '분기별', count: 8 },
  { id: 'half', label: '반기별', count: 6 },
  { id: 'year', label: '연별', count: 5 },
]

export function granularity(id) {
  return GRANULARITIES.find((g) => g.id === id) || GRANULARITIES[1]
}

function parts(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return { y, m, d }
}

const pad = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' → 해당 단위의 버킷 키 */
export function bucketKey(iso, id) {
  const { y, m } = parts(iso)
  switch (id) {
    case 'day':
      return String(iso).slice(0, 10)
    case 'month':
      return `${y}-${pad(m)}`
    case 'quarter':
      return `${y}-Q${Math.ceil(m / 3)}`
    case 'half':
      return `${y}-H${m <= 6 ? 1 : 2}`
    case 'year':
      return String(y)
    default:
      return `${y}-${pad(m)}`
  }
}

/** 버킷 키 → 축에 찍을 짧은 라벨 */
export function bucketLabel(key, id) {
  switch (id) {
    case 'day': {
      const { m, d } = parts(key)
      return `${m}/${d}`
    }
    case 'month': {
      const [y, m] = key.split('-')
      return Number(m) === 1 ? `${y.slice(2)}년 1월` : `${Number(m)}월`
    }
    case 'quarter': {
      const [y, q] = key.split('-')
      return q === 'Q1' ? `${y.slice(2)}년 1Q` : `${q.replace('Q', '')}Q`
    }
    case 'half': {
      const [y, h] = key.split('-')
      return `${y.slice(2)}년 ${h === 'H1' ? '상' : '하'}`
    }
    case 'year':
      return `${key}년`
    default:
      return key
  }
}

/** 버킷 키 → 화면 상단에 쓰는 긴 라벨 */
export function bucketTitle(key, id) {
  switch (id) {
    case 'day':
      return `${parts(key).y}년 ${parts(key).m}월 ${parts(key).d}일`
    case 'month':
      return `${key.split('-')[0]}년 ${Number(key.split('-')[1])}월`
    case 'quarter':
      return `${key.split('-')[0]}년 ${key.split('-')[1].replace('Q', '')}분기`
    case 'half':
      return `${key.split('-')[0]}년 ${key.split('-')[1] === 'H1' ? '상반기' : '하반기'}`
    case 'year':
      return `${key}년`
    default:
      return key
  }
}

/** 기준일에서 과거로 count 개의 연속된 버킷 키를 만든다(오래된 것 → 최신 순). */
export function buildBuckets(id, count, anchorISO) {
  const { y, m, d } = parts(anchorISO)
  const keys = []

  if (id === 'day') {
    const base = Date.UTC(y, m - 1, d)
    for (let i = count - 1; i >= 0; i -= 1) {
      const dt = new Date(base - i * 86400000)
      keys.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`)
    }
  } else if (id === 'month') {
    for (let i = count - 1; i >= 0; i -= 1) {
      const dt = new Date(Date.UTC(y, m - 1 - i, 1))
      keys.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`)
    }
  } else if (id === 'quarter') {
    const q0 = (y * 4 + (Math.ceil(m / 3) - 1)) - (count - 1)
    for (let i = 0; i < count; i += 1) {
      const n = q0 + i
      keys.push(`${Math.floor(n / 4)}-Q${(n % 4) + 1}`)
    }
  } else if (id === 'half') {
    const h0 = y * 2 + (m <= 6 ? 0 : 1) - (count - 1)
    for (let i = 0; i < count; i += 1) {
      const n = h0 + i
      keys.push(`${Math.floor(n / 2)}-H${(n % 2) + 1}`)
    }
  } else {
    for (let i = count - 1; i >= 0; i -= 1) keys.push(String(y - i))
  }

  return keys.map((key) => ({ key, label: bucketLabel(key, id), title: bucketTitle(key, id) }))
}

/** 'YYYY-MM' 을 n 개월 이동 */
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`
}

export function monthTitle(ym) {
  const [y, m] = ym.split('-')
  return `${y}년 ${Number(m)}월`
}
