import { useMemo, useState } from 'react'
import TrendChart from '../components/TrendChart.jsx'
import CategoryBars from '../components/CategoryBars.jsx'
import { useApp } from '../context/AppContext.jsx'
import { GRANULARITIES, bucketKey, buildBuckets, granularity } from '../lib/periods.js'
import { sumByBucket, totalsByCategory, totalsByGroup, totalsByUser } from '../lib/stats.js'
import { compactWon, formatWon } from '../lib/format.js'
import { displayName } from '../lib/accounts.js'
import { getCategory } from '../lib/categories.js'

export default function Stats() {
  const { expenses, categories: catalog, today } = useApp()
  const [unit, setUnit] = useState('month')
  const [scope, setScope] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [showTable, setShowTable] = useState(false)
  const [detail, setDetail] = useState(false)

  const g = granularity(unit)
  const buckets = useMemo(() => buildBuckets(unit, g.count, today), [unit, g.count, today])

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (scope === 'all' || e.username === scope) &&
          (categoryId === 'all' || e.categoryId === categoryId),
      ),
    [expenses, scope, categoryId],
  )

  const series = useMemo(
    () => sumByBucket(filtered, unit, buckets),
    [filtered, unit, buckets],
  )

  // 아래 상세는 그래프에 그려진 기간 전체를 기준으로 한다.
  const keys = useMemo(() => new Set(buckets.map((b) => b.key)), [buckets])
  const inWindow = useMemo(
    () => filtered.filter((e) => keys.has(bucketKey(e.date, unit))),
    [filtered, unit, keys],
  )
  const windowTitle = buckets.length
    ? `${buckets[0].title} ~ ${buckets[buckets.length - 1].title}`
    : ''

  const totals = series.map((s) => s.total)
  const sum = totals.reduce((a, b) => a + b, 0)
  const nonZero = totals.filter((t) => t > 0)
  const average = nonZero.length ? sum / nonZero.length : 0
  const peak = series.reduce((best, s) => (s.total > (best?.total || 0) ? s : best), null)

  const members = useMemo(() => totalsByUser(inWindow), [inWindow])

  // 기본은 그룹(식생활·이동·…) 단위 — 컬리·쿠팡·토스가 식생활로 묶여 보인다.
  const breakdown = useMemo(() => {
    if (detail) {
      return totalsByCategory(inWindow).map((row) => ({
        id: row.categoryId,
        emoji: getCategory(row.categoryId).emoji,
        name: getCategory(row.categoryId).name,
        total: row.total,
        share: row.share,
      }))
    }
    return totalsByGroup(inWindow).map((row) => ({
      id: row.group,
      emoji: getCategory(row.topCategoryId).emoji,
      name: row.group,
      note: row.categoryCount > 1 ? `${row.categoryCount}개` : '',
      total: row.total,
      share: row.share,
    }))
  }, [inWindow, detail])

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
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

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
          <TrendChart data={series} unitLabel={g.label} />
        )}
        <p className="hint" style={{ marginTop: 6 }}>
          막대를 누르면 그 구간 금액이 위에 표시됩니다.
        </p>
      </div>

      {/* 타일은 좁아서 전체 자릿수가 줄바꿈된다 — 압축 표기하고 정확한 값은 title 로 둔다 */}
      <div className="stat-row">
        <div className="stat">
          <div className="label">합계</div>
          <div className="value" title={formatWon(sum)}>{compactWon(sum)}원</div>
        </div>
        <div className="stat">
          <div className="label">{g.label} 평균</div>
          <div className="value" title={formatWon(average)}>{compactWon(average)}원</div>
        </div>
        <div className="stat">
          <div className="label">최대</div>
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
          <p className="hint" style={{ marginBottom: 10 }}>{windowTitle}</p>
          <CategoryBars rows={breakdown} limit={detail ? 30 : 12} />
        </div>
      )}

      {scope === 'all' && members.length > 0 && (
        <div className="card">
          <div className="section-title">
            <span>사람별</span>
            <span className="hint">{windowTitle}</span>
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
                const top = totalsByCategory(inWindow.filter((e) => e.username === m.username))[0]
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
