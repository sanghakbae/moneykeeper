import { formatWon } from '../lib/format.js'

/**
 * 순위 막대 — 값은 막대 위에 직접 붙인다.
 * rows: [{ id, emoji, name, note, total, share }]
 */
export default function CategoryBars({ rows, limit = 12 }) {
  if (!rows.length) return <p className="empty-state">기록이 없습니다.</p>

  const shown = rows.slice(0, limit)
  const rest = rows.slice(limit)
  const restTotal = rest.reduce((sum, r) => sum + r.total, 0)
  const all = restTotal > 0
    ? [
        ...shown,
        {
          id: '__rest__',
          emoji: '📊',
          name: `그 외 ${rest.length}개`,
          total: restTotal,
          share: rest.reduce((sum, r) => sum + r.share, 0),
        },
      ]
    : shown
  const max = Math.max(...all.map((r) => r.total), 1)

  return (
    <div className="cat-bars">
      {all.map((row) => (
        <div className="cat-bar" key={row.id}>
          <div className="top">
            <span className="n">
              <span aria-hidden="true">{row.emoji}</span>
              <span>{row.name}</span>
              {row.note && <span className="note">{row.note}</span>}
            </span>
            <span className="v">
              {formatWon(row.total)} · {Math.round(row.share * 100)}%
            </span>
          </div>
          <div className="track">
            <div className="fill" style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
