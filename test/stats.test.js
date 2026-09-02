import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBuckets } from '../src/lib/periods.js'
import { DEFAULT_CATEGORIES, setCategories } from '../src/lib/categories.js'
import {
  budgetAlerts,
  budgetStatus,
  livingExpenses,
  monthlyBudgetReport,
  sumByBucket,
  totalsByCategory,
  totalsByGroup,
} from '../src/lib/stats.js'

const expense = (username, categoryId, amount, date) => ({ username, categoryId, amount, date })

test('sumByBucket 은 버킷 밖의 지출을 버린다', () => {
  const buckets = buildBuckets('month', 2, '2026-08-17')
  const rows = sumByBucket(
    [
      expense('brpark', 'food', 10000, '2026-08-01'),
      expense('brpark', 'taxi', 5000, '2026-08-20'),
      expense('brpark', 'food', 7000, '2026-07-03'),
      expense('brpark', 'food', 9999, '2026-01-03'),
    ],
    'month',
    buckets,
  )
  assert.deepEqual(rows.map((r) => [r.key, r.total]), [
    ['2026-07', 7000],
    ['2026-08', 15000],
  ])
})

test('totalsByCategory 는 금액 순으로 비중과 함께 준다', () => {
  const rows = totalsByCategory([
    expense('brpark', 'food', 3000, '2026-08-01'),
    expense('brpark', 'coffee', 7000, '2026-08-01'),
  ])
  assert.equal(rows[0].categoryId, 'coffee')
  assert.equal(rows[0].share, 0.7)
  assert.equal(rows[1].share, 0.3)
})

test('고정비도 생활비에 포함한다', () => {
  const rows = livingExpenses([
    expense('brpark', 'insurance', 100000, '2026-08-01'),
    expense('brpark', 'electricity', 50000, '2026-08-01'),
    expense('brpark', 'rent', 200000, '2026-08-01'),
    expense('brpark', 'food', 10000, '2026-08-01'),
  ])
  assert.equal(rows.length, 4, '한도 제외로 표시한 것만 빠진다')
})

test("관리자가 '한도 제외'로 표시한 카테고리도 생활비에서 빠진다", () => {
  setCategories([
    { id: 'food', name: '식비', emoji: '🍚', group: '식생활' },
    { id: 'pocket', name: '용돈', emoji: '🧧', group: '가족', offBudget: true },
  ])
  try {
    const report = monthlyBudgetReport(
      [
        expense('shbae', 'pocket', 300000, '2026-08-01'),
        expense('shbae', 'food', 100000, '2026-08-02'),
      ],
      '2026-08',
      { limit: 500000, allowances: {} },
    )
    assert.equal(report.household.spent, 100000)
    assert.equal(report.household.level, 'ok')
    assert.equal(report.excludedTotal, 300000)
  } finally {
    setCategories(DEFAULT_CATEGORIES)
  }
})

test('budgetStatus 는 30% 남았을 때부터 경고한다', () => {
  assert.equal(budgetStatus(0, 100).level, 'none')
  assert.equal(budgetStatus(1000, 690).level, 'ok')
  assert.equal(budgetStatus(1000, 700).level, 'warn')
  assert.equal(budgetStatus(1000, 999).level, 'warn')
  assert.equal(budgetStatus(1000, 1000).level, 'over')
  assert.equal(budgetStatus(1000, 700).remaining, 300)
})

test('생활비 = 순수 생활비 + 용돈(지정액 전액) + 고정비', () => {
  const expenses = [
    expense('brpark', 'food', 300000, '2026-08-02'),
    expense('shbae', 'dining', 100000, '2026-08-03'),
    expense('hgbae', 'coffee', 40000, '2026-08-04'), // 용돈 멤버 — 생활비에 또 더하지 않는다
    expense('brpark', 'insurance', 200000, '2026-08-05'), // 고정비
    expense('brpark', 'food', 999, '2026-07-31'), // 다른 달
  ]
  const report = monthlyBudgetReport(expenses, '2026-08', {
    limit: 1000000,
    allowances: { hgbae: 150000 },
  })

  // 400,000(엄마·아빠) + 150,000(용돈 지정액) + 200,000(고정비)
  assert.deepEqual(report.breakdown, {
    living: 400000,
    allowance: 150000,
    fixed: 200000,
    total: 750000,
  })
  assert.equal(report.household.spent, 750000)
  assert.equal(report.household.level, 'warn') // 75% 사용

  // 참고값: 지정액과 실제 기록
  assert.equal(report.allowances[0].username, 'hgbae')
  assert.equal(report.allowances[0].limit, 150000)
  assert.equal(report.allowances[0].spent, 40000)
})

test('용돈은 실제로 얼마를 적었든 지정액만큼 센다', () => {
  const base = { limit: 1000000, allowances: { hgbae: 150000 } }
  const 기록없음 = monthlyBudgetReport([], '2026-08', base)
  const 조금썼음 = monthlyBudgetReport(
    [expense('hgbae', 'coffee', 5000, '2026-08-04')],
    '2026-08',
    base,
  )
  const 넘게썼음 = monthlyBudgetReport(
    [expense('hgbae', 'coffee', 900000, '2026-08-04')],
    '2026-08',
    base,
  )
  assert.equal(기록없음.household.spent, 150000)
  assert.equal(조금썼음.household.spent, 150000)
  assert.equal(넘게썼음.household.spent, 150000)
})

test('용돈은 따로 경고하지 않는다 — 항상 전액 사용이라', () => {
  const report = monthlyBudgetReport([], '2026-08', {
    limit: 1000000,
    allowances: { hgbae: 150000 },
  })
  assert.deepEqual(budgetAlerts(report), [])
})

test('한도를 넘으면 초과 경고가 나온다', () => {
  const report = monthlyBudgetReport(
    [expense('brpark', 'food', 120000, '2026-08-02')],
    '2026-08',
    { limit: 100000, allowances: {} },
  )
  const alerts = budgetAlerts(report)
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].level, 'over')
  assert.match(alerts[0].title, /초과/)
})

test('한도를 안 정했으면 경고하지 않는다', () => {
  const report = monthlyBudgetReport(
    [expense('brpark', 'food', 120000, '2026-08-02')],
    '2026-08',
    undefined,
  )
  assert.deepEqual(budgetAlerts(report), [])
})

test('totalsByGroup 은 하위 카테고리를 그룹으로 묶는다', () => {
  const rows = totalsByGroup([
    expense('shbae', 'toss', 11380, '2026-08-17'),
    expense('shbae', 'coffee', 4800, '2026-08-17'),
    expense('brpark', 'grocery', 132000, '2026-08-16'),
    expense('hgbae', 'dining', 68000, '2026-08-15'),
    expense('shbae', 'rent', 450000, '2026-08-01'),
  ])
  assert.deepEqual(rows.map((r) => [r.group, r.total]), [
    ['고정비', 450000],
    ['식생활', 216180],
  ])
  // 아이콘은 그 그룹에서 가장 많이 쓴 카테고리 것을 쓴다
  assert.equal(rows[1].topCategoryId, 'grocery')
  assert.equal(rows[1].categoryCount, 4)
  assert.equal(Math.round(rows[1].share * 100), 32)
})
