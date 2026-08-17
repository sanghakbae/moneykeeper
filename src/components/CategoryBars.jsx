import { getCategory } from '../lib/categories.js'
import { formatWon } from '../lib/format.js'

/** 카테고리별 순위 막대 — 값은 막대 위에 직접 붙인다. */
export default function CategoryBars({ rows, limit = 8 }) {
  if (!rows.length) return <p className="empty-state">기록이 없습니다.</p>

  const shown = rows.slice(0, limit)
  const rest = rows.slice(limit)
  const restTotal = rest.reduce((sum, r) => sum + r.total, 0)
  const restShare = rest.reduce((sum, r) => sum + r.share, 0)
  const all = restTotal > 0
    ? [...shown, { categoryId: '__rest__', total: restTotal, share: restShare, name: `기타 ${rest.length}개` }]
    : shown
  const max = Math.max(...all.map((r) => r.total), 1)

  return (
    <div className="cat-bars">
      {all.map((row) => {
        const category = row.name
          ? { emoji: '📊', name: row.name }
          : getCategory(row.categoryId)
        return (
          <div className="cat-bar" key={row.categoryId}>
            <div className="top">
              <span className="n">
                <span aria-hidden="true">{category.emoji}</span>
                <span>{category.name}</span>
              </span>
              <span className="v">
                {formatWon(row.total)} · {Math.round(row.share * 100)}%
              </span>
            </div>
            <div className="track">
              <div className="fill" style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
