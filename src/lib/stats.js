// 집계·한도 계산. 브라우저 API 를 쓰지 않는 순수 함수라 node --test 로 검증한다.

import { bucketKey } from './periods.js'
import { getCategory, isFixedCost, isOffBudget } from './categories.js'

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
 * 한도에 셀 지출만 남긴다.
 * 기본은 전부 포함 — 고정비도 용돈도 생활비에 들어간다.
 * 관리자가 '한도 제외'로 표시한 카테고리만 뺀다.
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
 * 한 달치 한도 현황. 기준은 하나 — 가구 생활비다.
 *
 * 사용액 = 순수 생활비 + 용돈 + 고정비
 *   - 순수 생활비: 용돈을 받지 않는 사람의 비고정 지출
 *   - 용돈: **지정액 전액**. 준 순간 나간 돈으로 본다. 그래서 용돈 받는 사람의
 *     개별 지출은 여기서 빼야 이중으로 세지 않는다.
 *   - 고정비: 고정비 카테고리 지출
 * 관리자가 '한도 제외'로 표시한 카테고리만 어느 쪽에도 들어가지 않는다.
 */
export function monthlyBudgetReport(expenses, ym, budget) {
  const limit = Number(budget?.limit) || 0
  const allowances = budget?.allowances || {}
  const living = livingExpenses(inMonth(expenses, ym))

  const allowanceUsers = Object.keys(allowances).filter((u) => Number(allowances[u]) > 0)
  const sum = (rows) => rows.reduce((total, e) => total + (e.amount || 0), 0)

  const fixedTotal = sum(living.filter((e) => isFixedCost(e.categoryId)))
  // 용돈은 전액 쓴 것으로 처리하므로, 용돈 받는 사람의 지출은 생활비에서 뺀다.
  const livingTotal = sum(
    living.filter((e) => !isFixedCost(e.categoryId) && !allowanceUsers.includes(e.username)),
  )
  const allowanceTotal = allowanceUsers.reduce((total, u) => total + Number(allowances[u]), 0)
  const householdSpent = livingTotal + allowanceTotal + fixedTotal

  return {
    month: ym,
    household: budgetStatus(limit, householdSpent),
    breakdown: {
      living: livingTotal,
      allowance: allowanceTotal,
      fixed: fixedTotal,
      total: householdSpent,
    },
    // 참고용 — 지정액과, 그 사람이 실제로 적어 둔 지출.
    allowances: allowanceUsers.map((username) => ({
      username,
      limit: Number(allowances[username]),
      spent: sum(living.filter((e) => e.username === username)),
    })),
    // '한도 제외'로 빠진 금액 — 설정 화면에서 얼마가 빠졌는지 보여준다(보통 0원).
    excludedTotal: sum(inMonth(expenses, ym).filter((e) => isOffBudget(e.categoryId))),
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
  // 용돈은 전액 사용으로 보므로 따로 경고하지 않는다 — 항상 100% 라 소음만 된다.
  push('이번 달 생활비', report.household)
  return alerts
}
