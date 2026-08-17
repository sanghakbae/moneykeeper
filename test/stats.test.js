import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBuckets } from '../src/lib/periods.js'
import {
  budgetAlerts,
  budgetStatus,
  livingExpenses,
  monthlyBudgetReport,
  sumByBucket,
  totalsByCategory,
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

test('고정비는 생활비에서 빠진다', () => {
  const rows = livingExpenses([
    expense('brpark', 'insurance', 100000, '2026-08-01'),
    expense('brpark', 'electricity', 50000, '2026-08-01'),
    expense('brpark', 'gas', 30000, '2026-08-01'),
    expense('brpark', 'rent', 200000, '2026-08-01'),
    expense('brpark', 'food', 10000, '2026-08-01'),
  ])
  assert.deepEqual(rows.map((r) => r.categoryId), ['food'])
})

test('budgetStatus 는 30% 남았을 때부터 경고한다', () => {
  assert.equal(budgetStatus(0, 100).level, 'none')
  assert.equal(budgetStatus(1000, 690).level, 'ok')
  assert.equal(budgetStatus(1000, 700).level, 'warn')
  assert.equal(budgetStatus(1000, 999).level, 'warn')
  assert.equal(budgetStatus(1000, 1000).level, 'over')
  assert.equal(budgetStatus(1000, 700).remaining, 300)
})

test('용돈이 있는 사람의 지출은 가족 생활비 한도에서 빠진다', () => {
  const expenses = [
    expense('brpark', 'food', 300000, '2026-08-02'),
    expense('shbae', 'dining', 100000, '2026-08-03'),
    expense('hgbae', 'coffee', 40000, '2026-08-04'),
    expense('brpark', 'insurance', 200000, '2026-08-05'), // 고정비 — 어디에도 안 들어감
    expense('brpark', 'food', 999, '2026-07-31'), // 다른 달
  ]
  const report = monthlyBudgetReport(expenses, '2026-08', {
    limit: 500000,
    allowances: { hgbae: 50000 },
  })

  assert.equal(report.household.spent, 400000)
  assert.equal(report.household.level, 'warn') // 80% 사용
  assert.equal(report.fixedTotal, 200000)

  assert.equal(report.allowances.length, 1)
  assert.equal(report.allowances[0].username, 'hgbae')
  assert.equal(report.allowances[0].spent, 40000)
  assert.equal(report.allowances[0].level, 'warn') // 80% 사용
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
