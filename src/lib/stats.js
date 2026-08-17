// 집계·한도 계산. 브라우저 API 를 쓰지 않는 순수 함수라 node --test 로 검증한다.

import { bucketKey } from './periods.js'
import { getCategory, isOffBudget } from './categories.js'

/** 한도의 30% 가 남았을 때부터 경고 → 사용률 70% 이상이면 warn, 100% 이상이면 over */
export const WARN_RATIO = 0.7

export function sumByBucket(expenses, granularityId, buckets) {
  const totals = new Map(buckets.map((b) => [b.key, 0]))
  for (const e of expenses) {
    const key = bucketKey(e.date, granularityId)
    if (totals.has(key)) totals.set(key, totals.get(key) + (e.amount || 0))
  }
  return buckets.map((b) => ({ ...b, total: totals.get(b.key) || 0 }))
}

export function totalsByCategory(expenses) {
  const totals = new Map()
  let sum = 0
  for (const e of expenses) {
    const amount = e.amount || 0
    totals.set(e.categoryId, (totals.get(e.categoryId) || 0) + amount)
    sum += amount
  }
  return [...totals.entries()]
    .map(([categoryId, total]) => ({ categoryId, total, share: sum ? total / sum : 0 }))
    .sort((a, b) => b.total - a.total)
}

/**
 * 그룹(식생활·이동·…) 단위 집계. 컬리·쿠팡·토스처럼 식비 하위로 둔 것들이
 * 따로 흩어지지 않고 '식생활' 로 묶여 보인다.
 * 아이콘은 그 그룹에서 가장 많이 쓴 카테고리 것을 쓴다.
 */
export function totalsByGroup(expenses) {
  const groups = new Map()
  let sum = 0
  for (const e of expenses) {
    const category = getCategory(e.categoryId)
    const key = category.group || '기타'
    const amount = e.amount || 0
    const entry = groups.get(key) || { group: key, total: 0, byCategory: new Map() }
    entry.total += amount
    entry.byCategory.set(e.categoryId, (entry.byCategory.get(e.categoryId) || 0) + amount)
    groups.set(key, entry)
    sum += amount
  }
  return [...groups.values()]
    .map((entry) => {
      const top = [...entry.byCategory.entries()].sort((a, b) => b[1] - a[1])[0]
      return {
        group: entry.group,
        total: entry.total,
        share: sum ? entry.total / sum : 0,
        topCategoryId: top?.[0],
        categoryCount: entry.byCategory.size,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function totalsByUser(expenses) {
  const totals = new Map()
  for (const e of expenses) {
    totals.set(e.username, (totals.get(e.username) || 0) + (e.amount || 0))
  }
  return [...totals.entries()]
    .map(([username, total]) => ({ username, total }))
    .sort((a, b) => b.total - a.total)
}

/**
 * 생활비(변동비)만 남긴다.
 * 보험료·전기세·가스비·관리비 등 고정비와 용돈은 한도에서 뺀다.
 */
export function livingExpenses(expenses) {
  return expenses.filter((e) => !isOffBudget(e.categoryId))
}

export function inMonth(expenses, ym) {
  return expenses.filter((e) => String(e.date).slice(0, 7) === ym)
}

/**
 * 한도 대비 사용 상태.
 * level: 'none'(한도 미설정) | 'ok' | 'warn'(30% 이하 남음) | 'over'(초과)
 */
export function budgetStatus(limit, spent) {
  const l = Number(limit) || 0
  const s = Math.max(0, Number(spent) || 0)
  if (l <= 0) return { limit: 0, spent: s, remaining: 0, ratio: 0, level: 'none' }
  const ratio = s / l
  const level = ratio >= 1 ? 'over' : ratio >= WARN_RATIO ? 'warn' : 'ok'
  return { limit: l, spent: s, remaining: l - s, ratio, level }
}

/**
 * 한 달치 한도 현황.
 *
 * - 고정비 카테고리는 어느 한도에도 포함하지 않는다.
 * - 용돈이 지정된 멤버의 지출은 그 멤버의 용돈 한도로만 계산하고,
 *   가구 생활비 한도에서는 빼서 이중 계산을 막는다.
 */
export function monthlyBudgetReport(expenses, ym, budget) {
  const limit = Number(budget?.limit) || 0
  const allowances = budget?.allowances || {}
  const living = livingExpenses(inMonth(expenses, ym))

  const allowanceUsers = Object.keys(allowances).filter((u) => Number(allowances[u]) > 0)
  const householdSpent = living
    .filter((e) => !allowanceUsers.includes(e.username))
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  return {
    month: ym,
    household: budgetStatus(limit, householdSpent),
    allowances: allowanceUsers.map((username) => ({
      username,
      ...budgetStatus(
        allowances[username],
        living
          .filter((e) => e.username === username)
          .reduce((sum, e) => sum + (e.amount || 0), 0),
      ),
    })),
    // 한도에서 빠진 금액(고정비 + 용돈) — 설정 화면에서 얼마가 빠졌는지 보여준다.
    excludedTotal: inMonth(expenses, ym)
      .filter((e) => isOffBudget(e.categoryId))
      .reduce((sum, e) => sum + (e.amount || 0), 0),
  }
}

/** 화면에 띄울 경고 문구. 없으면 null. */
export function budgetAlerts(report, nameOf = (u) => u) {
  const alerts = []
  const push = (scope, status) => {
    if (status.level === 'over') {
      alerts.push({
        level: 'over',
        title: `${scope} 한도 초과`,
        detail: `${Math.round(status.ratio * 100)}% 사용 · ${Math.abs(status.remaining).toLocaleString('ko-KR')}원 초과`,
      })
    } else if (status.level === 'warn') {
      alerts.push({
        level: 'warn',
        title: `${scope} 한도 30% 이하 남음`,
        detail: `${Math.round(status.ratio * 100)}% 사용 · ${status.remaining.toLocaleString('ko-KR')}원 남음`,
      })
    }
  }
  push('이번 달 생활비', report.household)
  for (const a of report.allowances) push(`${nameOf(a.username)} 용돈`, a)
  return alerts
}
