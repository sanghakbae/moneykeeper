import { useState } from 'react'
import { categoryGroups, getCategory, offBudgetTag } from '../lib/categories.js'
import { useApp } from '../context/AppContext.jsx'

/** 카테고리 선택 — 그룹 탭으로 나눠 한 화면에 담는다. */
export default function CategoryPicker({ value, onChange }) {
  const { categories } = useApp()
  const groups = categoryGroups(categories)
  const [group, setGroup] = useState(() => getCategory(value).group || groups[0])

  const activeGroup = groups.includes(group) ? group : groups[0]
  const shown = categories.filter((c) => c.group === activeGroup)

  return (
    <div className="card">
      <div className="section-title">
        <span>카테고리</span>
        {value && (
          <span className="hint">
            {getCategory(value).emoji} {getCategory(value).name}
            {offBudgetTag(value) ? ` · ${offBudgetTag(value)}` : ''}
          </span>
        )}
      </div>

      <div className="cat-groups" style={{ marginBottom: 10 }}>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={activeGroup === g}
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
            {offBudgetTag(c.id) && <span className="fixed-tag">{offBudgetTag(c.id)}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
