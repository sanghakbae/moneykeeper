import { useMemo, useState } from 'react'
import TrendChart from '../components/TrendChart.jsx'
import CategoryBars from '../components/CategoryBars.jsx'
import { useApp } from '../context/AppContext.jsx'
import { GRANULARITIES, bucketKey, buildBuckets, granularity } from '../lib/periods.js'
import { sumByBucket, totalsByCategory, totalsByUser } from '../lib/stats.js'
import { formatWon } from '../lib/format.js'
import { displayName } from '../lib/accounts.js'
import { getCategory } from '../lib/categories.js'

export default function Stats() {
  const { expenses, today } = useApp()
  const [unit, setUnit] = useState('month')
  const [scope, setScope] = useState('all')
  const [showTable, setShowTable] = useState(false)

  const g = granularity(unit)
  const buckets = useMemo(() => buildBuckets(unit, g.count, today), [unit, g.count, today])

  const filtered = useMemo(
    () => (scope === 'all' ? expenses : expenses.filter((e) => e.username === scope)),
    [expenses, scope],
  )

  const series = useMemo(
    () => sumByBucket(filtered, unit, buckets),
    [filtered, unit, buckets],
  )

  // 판독부에서 선택한 구간이 아니라, 가장 최근 구간을 기준으로 아래 상세를 보여준다.
  const latestKey = buckets[buckets.length - 1]?.key
  const inLatest = useMemo(
    () => filtered.filter((e) => bucketKey(e.date, unit) === latestKey),
    [filtered, unit, latestKey],
  )

  const totals = series.map((s) => s.total)
  const sum = totals.reduce((a, b) => a + b, 0)
  const nonZero = totals.filter((t) => t > 0)
  const average = nonZero.length ? sum / nonZero.length : 0
  const peak = series.reduce((best, s) => (s.total > (best?.total || 0) ? s : best), null)

  const categories = useMemo(() => totalsByCategory(inLatest), [inLatest])
  const members = useMemo(() => totalsByUser(inLatest), [inLatest])

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

      <div className="card">
        <div className="section-title">
          <span>{g.label} 지출 추이</span>
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

      <div className="stat-row">
        <div className="stat">
          <div className="label">합계</div>
          <div className="value">{formatWon(sum)}</div>
        </div>
        <div className="stat">
          <div className="label">{g.label} 평균</div>
          <div className="value">{formatWon(average)}</div>
        </div>
        <div className="stat">
          <div className="label">최대</div>
          <div className="value">{formatWon(peak?.total || 0)}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <span>카테고리별 · {buckets[buckets.length - 1]?.title}</span>
        </div>
        <CategoryBars rows={categories} />
      </div>

      {scope === 'all' && members.length > 0 && (
        <div className="card">
          <div className="section-title">
            <span>사람별 · {buckets[buckets.length - 1]?.title}</span>
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
                const top = totalsByCategory(inLatest.filter((e) => e.username === m.username))[0]
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
