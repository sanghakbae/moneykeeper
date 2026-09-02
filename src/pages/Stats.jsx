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
import { ALLOWANCE_CATEGORY_ID, getCategory, isFixedCost } from '../lib/categories.js'

const KIND_LABEL = { living: '생활비', allowance: '용돈', fixed: '고정비' }

const KIND_NOTE = {
  all: '생활비 + 용돈 + 고정비를 모두 합칩니다.',
  living: '생활비만 — 고정비와 용돈은 뺐습니다.',
  allowance: '용돈만 — 매달 정한 지정액입니다.',
  fixed: '고정비만 — 관리비·전기세·보험료 등입니다.',
}

export default function Stats() {
  const { expenses, budgets, categories: catalog, today } = useApp()
  const [unit, setUnit] = useState('month')
  const [scope, setScope] = useState('all')
  const [kind, setKind] = useState('all')
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

  // 종류 구분 — 용돈은 가상 항목, 고정비는 카테고리 표시, 나머지가 생활비다.
  const kindOf = (e) => {
    if (e.categoryId === ALLOWANCE_CATEGORY_ID) return 'allowance'
    return isFixedCost(e.categoryId) ? 'fixed' : 'living'
  }

  const filtered = useMemo(
    () =>
      allExpenses.filter(
        (e) =>
          (scope === 'all' || e.username === scope) &&
          (kind === 'all' || kindOf(e) === kind) &&
          (categoryId === 'all' || e.categoryId === categoryId),
      ),
    [allExpenses, scope, kind, categoryId],
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

  // 사람별 표는 종류를 열로 쪼개 보여주므로 종류 필터를 적용하지 않은 목록을 쓴다.
  const inBucketAllKinds = useMemo(() => {
    if (!activeBucket) return []
    return allExpenses.filter(
      (e) =>
        bucketKey(e.date, unit) === activeBucket.key &&
        (scope === 'all' || e.username === scope) &&
        (categoryId === 'all' || e.categoryId === categoryId),
    )
  }, [allExpenses, unit, activeBucket, scope, categoryId])
  const bucketTitle = activeBucket ? activeBucket.title : ''

  const totals = series.map((s) => s.total)
  const sum = totals.reduce((a, b) => a + b, 0)
  const nonZero = totals.filter((t) => t > 0)
  const average = nonZero.length ? sum / nonZero.length : 0
  const peak = series.reduce((best, s) => (s.total > (best?.total || 0) ? s : best), null)

  // 사람마다 생활비·용돈·고정비를 따로 센다. 한 칸에 합쳐 놓으면
  // '엄마 용돈 30만' 인데 생활비까지 더해진 값처럼 보인다.
  const members = useMemo(() => {
    const rows = new Map()
    for (const e of inBucketAllKinds) {
      const row = rows.get(e.username) || { username: e.username, living: 0, allowance: 0, fixed: 0 }
      row[kindOf(e)] += e.amount || 0
      rows.set(e.username, row)
    }
    return [...rows.values()]
      .map((r) => ({ ...r, total: r.living + r.allowance + r.fixed }))
      .sort((a, b) => b.total - a.total)
  }, [inBucketAllKinds])

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
          { id: 'all', label: '전체' },
          { id: 'living', label: '생활비' },
          { id: 'allowance', label: '용돈' },
          { id: 'fixed', label: '고정비' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={kind === option.id}
            onClick={() => setKind(option.id)}
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
        {KIND_NOTE[kind]}
        {scope !== 'all' && ` · ${displayName(scope)}만 봅니다.`}
      </p>

      <div className="card">
        <div className="section-title">
          <span>
            {g.label} 지출 추이
            {kind !== 'all' && ` · ${KIND_LABEL[kind]}`}
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

      {members.length > 0 && (
        <div className="card">
          <div className="section-title">
            <span>사람별</span>
            <span className="hint">{bucketTitle}</span>
          </div>
          <table className="data member-table">
            <thead>
              <tr>
                <th>가족</th>
                <th>생활비</th>
                <th>용돈</th>
                <th>고정비</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.username}>
                  <td>{displayName(m.username)}</td>
                  <td>{m.living ? formatWon(m.living) : '-'}</td>
                  <td>{m.allowance ? formatWon(m.allowance) : '-'}</td>
                  <td>{m.fixed ? formatWon(m.fixed) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
