import { useEffect, useMemo, useState } from 'react'
import TrendChart from '../components/TrendChart.jsx'
import CategoryBars from '../components/CategoryBars.jsx'
import { useApp } from '../context/AppContext.jsx'
import { GRANULARITIES, bucketKey, buildBuckets, granularity } from '../lib/periods.js'
import {
  sumByBucket,
  withAllowances,
  totalsByCategory,
  totalsByGroup,
  totalsByUser,
} from '../lib/stats.js'
import { compactWon, formatWon } from '../lib/format.js'
import { displayName } from '../lib/accounts.js'
import { ALLOWANCE_CATEGORY_ID, getCategory } from '../lib/categories.js'

export default function Stats() {
  const { expenses, budgets, categories: catalog, today } = useApp()
  const [unit, setUnit] = useState('month')
  const [scope, setScope] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [showTable, setShowTable] = useState(false)
  const [detail, setDetail] = useState(false)
  const [selectedKey, setSelectedKey] = useState('')

  const g = granularity(unit)
  const buckets = useMemo(
    () => buildBuckets(unit, g.count, today, { calendarYear: g.calendarYear }),
    [unit, g.count, g.calendarYear, today],
  )

  // 통계에는 용돈 지정액도 지출로 얹는다. 고정비는 원래 기록이라 그대로 들어간다.
  const allExpenses = useMemo(() => withAllowances(expenses, budgets), [expenses, budgets])

  const filtered = useMemo(
    () =>
      allExpenses.filter(
        (e) =>
          (scope === 'all' || e.username === scope) &&
          (categoryId === 'all' || e.categoryId === categoryId),
      ),
    [allExpenses, scope, categoryId],
  )

  const series = useMemo(
    () => sumByBucket(filtered, unit, buckets),
    [filtered, unit, buckets],
  )

  // 기간 단위를 바꾸면 오늘이 속한 구간으로 되돌린다.
  // 월별은 1~12월을 다 그리므로 마지막 버킷(12월)이 아직 오지 않은 달일 수 있다.
  const todayKey = bucketKey(today, unit)
  const defaultKey = buckets.some((b) => b.key === todayKey)
    ? todayKey
    : buckets.length
      ? buckets[buckets.length - 1].key
      : ''
  useEffect(() => {
    setSelectedKey(defaultKey)
  }, [unit, defaultKey])

  // 아래 상세(카테고리별·사람별)는 그래프에서 고른 '한 구간' 만 본다.
  // 월별이면 그 달, 분기별이면 그 분기 — 상단 필터와 어긋나지 않게.
  const activeBucket =
    buckets.find((b) => b.key === selectedKey) ||
    buckets.find((b) => b.key === defaultKey) ||
    null
  const inBucket = useMemo(
    () =>
      activeBucket
        ? filtered.filter((e) => bucketKey(e.date, unit) === activeBucket.key)
        : [],
    [filtered, unit, activeBucket],
  )
  const bucketTitle = activeBucket ? activeBucket.title : ''

  const totals = series.map((s) => s.total)
  const sum = totals.reduce((a, b) => a + b, 0)
  const nonZero = totals.filter((t) => t > 0)
  const average = nonZero.length ? sum / nonZero.length : 0
  const peak = series.reduce((best, s) => (s.total > (best?.total || 0) ? s : best), null)

  const members = useMemo(() => totalsByUser(inBucket), [inBucket])

  // 기본은 그룹(식생활·이동·…) 단위 — 컬리·쿠팡·토스가 식생활로 묶여 보인다.
  const breakdown = useMemo(() => {
    if (detail) {
      return totalsByCategory(inBucket).map((row) => ({
        id: row.categoryId,
        emoji: getCategory(row.categoryId).emoji,
        name: getCategory(row.categoryId).name,
        total: row.total,
        share: row.share,
      }))
    }
    return totalsByGroup(inBucket).map((row) => ({
      id: row.group,
      emoji: getCategory(row.topCategoryId).emoji,
      name: row.group,
      note: row.categoryCount > 1 ? `${row.categoryCount}개` : '',
      total: row.total,
      share: row.share,
    }))
  }, [inBucket, detail])

  return (
    <div className="screen">
      <div className="seg">
        {GRANULARITIES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={unit === option.id}
            onClick={() => setUnit(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="seg">
        {[
          { id: 'all', label: '가족 전체' },
          { id: 'brpark', label: '엄마' },
          { id: 'shbae', label: '아빠' },
          { id: 'hgbae', label: '아들' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={scope === option.id}
            onClick={() => setScope(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 카테고리는 수가 많아 세그먼트로는 안 담긴다 — 선택 목록으로 고른다 */}
      <div className="cat-filter">
        <label htmlFor="stat-category">카테고리</label>
        <select
          id="stat-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="all">전체</option>
          <option value={ALLOWANCE_CATEGORY_ID}>🧧 용돈</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 가족 전체는 생활비·용돈·고정비를 전부 합친 값이고,
          한 사람을 고르면 그 사람이 용돈으로 쓴 내역이 된다. */}
      <p className="hint" style={{ margin: '-2px 2px 0' }}>
        {scope === 'all'
          ? '가족 전체 — 생활비 + 용돈 + 고정비를 모두 합칩니다.'
          : `${displayName(scope)} — 쓴 지출과 받은 용돈을 합칩니다.`}
      </p>

      <div className="card">
        <div className="section-title">
          <span>
            {g.label} 지출 추이
            {categoryId !== 'all' && ` · ${getCategory(categoryId).name}`}
          </span>
          <button type="button" className="link-btn" onClick={() => setShowTable((v) => !v)}>
            {showTable ? '그래프 보기' : '표로 보기'}
          </button>
        </div>

        {showTable ? (
          <table className="data">
            <thead>
              <tr>
                <th>기간</th>
                <th>지출</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((row) => (
                <tr key={row.key}>
                  <td>{row.title}</td>
                  <td>{formatWon(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TrendChart
            data={series}
            unitLabel={g.label}
            selectedKey={activeBucket?.key}
            onSelect={setSelectedKey}
          />
        )}
        <p className="hint" style={{ marginTop: 6 }}>
          막대를 누르면 아래 카테고리별·사람별이 그 구간 기준으로 바뀝니다.
        </p>
      </div>

      {/* 타일은 좁아서 전체 자릿수가 줄바꿈된다 — 압축 표기하고 정확한 값은 title 로 둔다 */}
      <div className="stat-row">
        <div className="stat">
          <div className="label">{g.count}{g.unit} 합계</div>
          <div className="value" title={formatWon(sum)}>{compactWon(sum)}원</div>
        </div>
        <div className="stat">
          <div className="label">{g.noun} 평균</div>
          <div className="value" title={formatWon(average)}>{compactWon(average)}원</div>
        </div>
        <div className="stat">
          <div className="label">최대 {g.noun}</div>
          <div className="value" title={formatWon(peak?.total || 0)}>
            {compactWon(peak?.total || 0)}원
          </div>
        </div>
      </div>

      {categoryId === 'all' && (
        <div className="card">
          <div className="section-title">
            <span>{detail ? '세부 카테고리별' : '카테고리별'}</span>
            <button type="button" className="link-btn" onClick={() => setDetail((v) => !v)}>
              {detail ? '묶어서 보기' : '자세히 보기'}
            </button>
          </div>
          <p className="hint" style={{ marginBottom: 10 }}>{bucketTitle}</p>
          <CategoryBars rows={breakdown} limit={detail ? 30 : 12} />
        </div>
      )}

      {scope === 'all' && members.length > 0 && (
        <div className="card">
          <div className="section-title">
            <span>사람별</span>
            <span className="hint">{bucketTitle}</span>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>가족</th>
                <th>지출</th>
                <th>가장 많이 쓴 곳</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const top = totalsByCategory(inBucket.filter((e) => e.username === m.username))[0]
                return (
                  <tr key={m.username}>
                    <td>{displayName(m.username)}</td>
                    <td>{formatWon(m.total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {top ? `${getCategory(top.categoryId).emoji} ${getCategory(top.categoryId).name}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
