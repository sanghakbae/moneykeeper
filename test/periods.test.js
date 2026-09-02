import test from 'node:test'
import assert from 'node:assert/strict'
import { bucketKey, bucketLabel, buildBuckets, shiftMonth } from '../src/lib/periods.js'

test('bucketKey 는 단위별로 올바른 키를 만든다', () => {
  assert.equal(bucketKey('2026-08-17', 'day'), '2026-08-17')
  assert.equal(bucketKey('2026-08-17', 'month'), '2026-08')
  assert.equal(bucketKey('2026-08-17', 'quarter'), '2026-Q3')
  assert.equal(bucketKey('2026-01-31', 'quarter'), '2026-Q1')
  assert.equal(bucketKey('2026-12-01', 'quarter'), '2026-Q4')
  assert.equal(bucketKey('2026-06-30', 'half'), '2026-H1')
  assert.equal(bucketKey('2026-07-01', 'half'), '2026-H2')
  assert.equal(bucketKey('2026-08-17', 'year'), '2026')
})

test('buildBuckets(day) 는 기준일까지 연속된 날짜를 만든다', () => {
  const buckets = buildBuckets('day', 3, '2026-03-01')
  assert.deepEqual(buckets.map((b) => b.key), ['2026-02-27', '2026-02-28', '2026-03-01'])
})

test('buildBuckets(month) 는 연도 경계를 넘는다', () => {
  const buckets = buildBuckets('month', 3, '2026-01-15')
  assert.deepEqual(buckets.map((b) => b.key), ['2025-11', '2025-12', '2026-01'])
})

test('buildBuckets(quarter) 는 분기 경계를 넘는다', () => {
  const buckets = buildBuckets('quarter', 3, '2026-02-10')
  assert.deepEqual(buckets.map((b) => b.key), ['2025-Q3', '2025-Q4', '2026-Q1'])
})

test('buildBuckets(half) 는 반기 경계를 넘는다', () => {
  const buckets = buildBuckets('half', 3, '2026-08-17')
  assert.deepEqual(buckets.map((b) => b.key), ['2025-H2', '2026-H1', '2026-H2'])
})

test('buildBuckets(year) 는 최근 연도들을 만든다', () => {
  const buckets = buildBuckets('year', 3, '2026-08-17')
  assert.deepEqual(buckets.map((b) => b.key), ['2024', '2025', '2026'])
})

test('라벨은 사람이 읽는 형태다', () => {
  assert.equal(bucketLabel('2026-08-17', 'day'), '8/17')
  assert.equal(bucketLabel('2026-08', 'month'), '8')
  assert.equal(bucketLabel('2026-01', 'month'), '1')
  assert.equal(bucketLabel('2026-H1', 'half'), '26년 상')
  assert.equal(bucketLabel('2026', 'year'), '2026년')
})

test('shiftMonth 는 연도 경계를 넘는다', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
})

test('월별은 그 해 1월~12월을 만든다', () => {
  const buckets = buildBuckets('month', 12, '2026-08-30', { calendarYear: true })
  assert.equal(buckets.length, 12)
  assert.equal(buckets[0].key, '2026-01')
  assert.equal(buckets[11].key, '2026-12')
  assert.deepEqual(buckets.map((b) => b.label), ['1','2','3','4','5','6','7','8','9','10','11','12'])
  // 축 첫 라벨에도 연도를 붙이지 않는다
  assert.equal(buckets[0].labelWithYear, '1')
})
