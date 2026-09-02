import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBuckets } from '../src/lib/periods.js'
import {
  ALLOWANCE_CATEGORY_ID,
  DEFAULT_CATEGORIES,
  getCategory,
  setCategories,
} from '../src/lib/categories.js'
import {
  budgetAlerts,
  budgetStatus,
  livingExpenses,
  monthlyBudgetReport,
  sumByBucket,
  totalsByCategory,
  totalsByGroup,
  withAllowances,
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

test('한도는 생활비만 센다 — 고정비·용돈은 차감하지 않는다', () => {
  const expenses = [
    expense('brpark', 'food', 300000, '2026-08-02'),
    expense('shbae', 'dining', 100000, '2026-08-03'),
    expense('hgbae', 'coffee', 40000, '2026-08-04'),
    expense('brpark', 'insurance', 200000, '2026-08-05'), // 고정비
    expense('shbae', 'rent', 450000, '2026-08-05'), // 고정비
    expense('brpark', 'food', 999, '2026-07-31'), // 다른 달
  ]
  const report = monthlyBudgetReport(expenses, '2026-08', {
    limit: 1000000,
    allowances: { hgbae: 200000 },
  })

  // 게이지에는 비고정 지출만: 300,000 + 100,000 + 40,000
  assert.equal(report.household.spent, 440000)
  assert.equal(report.household.remaining, 560000)

  // 고정비 650,000 과 용돈 지정액 200,000 은 한도 밖 — 통계용으로만 들고 있다
  assert.deepEqual(report.breakdown, {
    living: 440000,
    fixed: 650000,
    allowance: 200000,
    spent: 1090000,
  })
})

test('지출을 적으면 한도가 그만큼 줄어든다', () => {
  const budget = { limit: 2000000, allowances: { hgbae: 200000 } }
  const 없을때 = monthlyBudgetReport([], '2026-09', budget)
  const 있을때 = monthlyBudgetReport(
    [
      expense('brpark', 'kurly', 95104, '2026-09-01'),
      expense('brpark', 'coupang', 14000, '2026-09-01'),
    ],
    '2026-09',
    budget,
  )
  assert.equal(없을때.household.remaining, 2000000, '용돈은 한도를 깎지 않는다')
  assert.equal(있을때.household.spent, 109104)
  assert.equal(있을때.household.remaining, 1890896)
})

test('고정비를 아무리 적어도 생활비 한도는 그대로다', () => {
  const budget = { limit: 1000000, allowances: {} }
  const before = monthlyBudgetReport(
    [expense('brpark', 'food', 100000, '2026-09-01')],
    '2026-09',
    budget,
  )
  const after = monthlyBudgetReport(
    [
      expense('brpark', 'food', 100000, '2026-09-01'),
      expense('brpark', 'rent', 900000, '2026-09-01'),
      expense('brpark', 'electricity', 80000, '2026-09-02'),
    ],
    '2026-09',
    budget,
  )
  assert.equal(before.household.spent, after.household.spent)
  assert.equal(after.household.spent, 100000)
  assert.equal(after.breakdown.fixed, 980000)
})

test('용돈은 따로 경고하지 않는다 — 한도 밖이라', () => {
  const report = monthlyBudgetReport(
    [expense('hgbae', 'coffee', 500000, '2026-08-04')],
    '2026-08',
    { limit: 1000000, allowances: { hgbae: 100000 } },
  )
  assert.deepEqual(budgetAlerts(report), [], '생활비도 50% 라 경고 없음')
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

test('통계용 목록에는 용돈 지정액이 지출로 얹힌다', () => {
  const rows = withAllowances(
    [expense('brpark', 'food', 100000, '2026-09-05')],
    {
      '2026-09': { limit: 2000000, allowances: { hgbae: 200000, shbae: 0 } },
      '2026-08': { limit: 2000000, allowances: { hgbae: 150000 } },
    },
  )
  const 용돈 = rows.filter((r) => r.categoryId === ALLOWANCE_CATEGORY_ID)
  assert.equal(rows.length, 3, '기록 1건 + 용돈 2건(0원짜리는 제외)')
  assert.deepEqual(
    용돈.map((r) => [r.date, r.username, r.amount]).sort(),
    [['2026-08-01', 'hgbae', 150000], ['2026-09-01', 'hgbae', 200000]],
  )
  assert.equal(getCategory(ALLOWANCE_CATEGORY_ID).name, '용돈')
})

test('용돈을 얹어도 한도 계산은 그대로다', () => {
  const budgets = { '2026-09': { limit: 2000000, allowances: { hgbae: 200000 } } }
  const raw = [expense('brpark', 'food', 100000, '2026-09-05')]
  const report = monthlyBudgetReport(raw, '2026-09', budgets['2026-09'])
  assert.equal(report.household.spent, 100000, '한도에는 용돈이 들어가지 않는다')

  // 통계 쪽 합계는 용돈까지 포함
  const total = withAllowances(raw, budgets)
    .filter((e) => e.date.startsWith('2026-09'))
    .reduce((sum, e) => sum + e.amount, 0)
  assert.equal(total, 300000)
})
