import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_GROUPS, getCategory } from '../lib/categories.js'

/**
 * 카테고리 선택. 첫 화면은 "자주 쓰는" — 내 지출 기록에서 많이 쓴 순서라
 * 대부분 한 번의 탭으로 끝난다. 나머지는 그룹 탭으로 넘어간다.
 */
export default function CategoryPicker({ value, onChange, recentIds }) {
  const [group, setGroup] = useState('자주 쓰는')

  const frequent = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const id of recentIds) {
      if (seen.has(id)) continue
      seen.add(id)
      list.push(getCategory(id))
      if (list.length >= 8) break
    }
    for (const c of CATEGORIES) {
      if (list.length >= 8) break
      if (!seen.has(c.id) && !c.fixed) {
        seen.add(c.id)
        list.push(c)
      }
    }
    return list
  }, [recentIds])

  const shown = group === '자주 쓰는' ? frequent : CATEGORIES.filter((c) => c.group === group)

  return (
    <div className="card">
      <div className="section-title">
        <span>카테고리</span>
        {value && (
          <span className="hint">
            {getCategory(value).emoji} {getCategory(value).name}
            {getCategory(value).fixed ? ' · 고정비' : ''}
          </span>
        )}
      </div>

      <div className="cat-groups" style={{ marginBottom: 10 }}>
        {['자주 쓰는', ...CATEGORY_GROUPS].map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="cat-grid">
        {shown.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={value === c.id}
            onClick={() => onChange(c.id)}
          >
            <span className="emoji" aria-hidden="true">{c.emoji}</span>
            <span className="name">{c.name}</span>
            {c.fixed && <span className="fixed-tag">고정비</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
