import { useMemo, useState } from 'react'
import {
  DEFAULT_CATEGORIES,
  categoryGroups,
  newCategoryId,
  normalizeCategories,
} from '../lib/categories.js'
import { saveCategories } from '../lib/store.js'

/** 관리자 전용 카테고리 편집 — 이름·아이콘·그룹·한도 제외 여부를 고치고 추가/삭제한다. */
export default function CategoryEditor({ categories, expenses, user, notify, onClose }) {
  const [items, setItems] = useState(() => categories.map((c) => ({ ...c })))
  const [busy, setBusy] = useState(false)

  const groups = categoryGroups(items)
  const usage = useMemo(() => {
    const counts = new Map()
    for (const e of expenses) counts.set(e.categoryId, (counts.get(e.categoryId) || 0) + 1)
    return counts
  }, [expenses])

  const patch = (id, changes) =>
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)))

  const move = (index, delta) =>
    setItems((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const remove = (id) => setItems((prev) => prev.filter((c) => c.id !== id))

  const add = (group) =>
    setItems((prev) => [
      ...prev,
      { id: newCategoryId(), name: '', emoji: '🏷️', group },
    ])

  const save = async () => {
    const cleaned = normalizeCategories(items)
    if (!cleaned.length) return notify('카테고리가 하나는 있어야 합니다')
    setBusy(true)
    try {
      await saveCategories(cleaned, user)
      notify('카테고리를 저장했어요')
      onClose()
    } catch (e) {
      notify(e?.message || '저장하지 못했습니다')
    } finally {
      setBusy(false)
    }
    return undefined
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="카테고리 관리"
      >
        <h3>카테고리 관리</h3>
        <p className="hint">
          이름·아이콘·그룹을 고치고 순서를 바꿀 수 있습니다. &apos;한도 제외&apos;로 두면 생활비
          한도 계산에서 빠집니다(고정비·용돈).
        </p>

        {groups.map((group) => (
          <div key={group}>
            <div className="section-title" style={{ marginTop: 6 }}>
              <span>{group}</span>
              <button type="button" className="link-btn" onClick={() => add(group)}>
                + 추가
              </button>
            </div>

            {items.map((c, index) =>
              c.group !== group ? null : (
                <div className="cat-edit" key={c.id}>
                  <input
                    className="cat-edit-emoji"
                    value={c.emoji}
                    onChange={(e) => patch(c.id, { emoji: e.target.value })}
                    maxLength={4}
                    aria-label="아이콘"
                  />
                  <input
                    className="cat-edit-name"
                    value={c.name}
                    onChange={(e) => patch(c.id, { name: e.target.value })}
                    placeholder="이름"
                    maxLength={12}
                    aria-label="이름"
                  />
                  <button
                    type="button"
                    className="cat-edit-flag"
                    aria-pressed={Boolean(c.fixed || c.offBudget)}
                    onClick={() =>
                      patch(c.id, {
                        fixed: false,
                        offBudget: !(c.fixed || c.offBudget),
                      })}
                    title="생활비 한도에서 제외"
                  >
                    한도 제외
                  </button>
                  <button
                    type="button"
                    className="cat-edit-move"
                    onClick={() => move(index, -1)}
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="cat-edit-move"
                    onClick={() => move(index, 1)}
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="cat-edit-del"
                    onClick={() => remove(c.id)}
                    aria-label={`${c.name} 삭제`}
                    title={
                      usage.get(c.id)
                        ? `기록 ${usage.get(c.id)}건 — 지우면 '미분류'로 표시됩니다`
                        : '삭제'
                    }
                  >
                    ✕
                  </button>
                </div>
              ),
            )}
          </div>
        ))}

        <div className="section-title" style={{ marginTop: 10 }}>
          <span>새 그룹</span>
          <NewGroup onAdd={(name) => setItems((prev) => [
            ...prev,
            { id: newCategoryId(), name: '', emoji: '🏷️', group: name },
          ])}
          />
        </div>

        <button className="btn" type="button" onClick={save} disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => setItems(DEFAULT_CATEGORIES.map((c) => ({ ...c })))}
          disabled={busy}
        >
          기본값으로 되돌리기
        </button>
        <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
          취소
        </button>
      </div>
    </div>
  )
}

function NewGroup({ onAdd }) {
  const [name, setName] = useState('')
  return (
    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        className="cat-edit-name"
        style={{ height: 32 }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="그룹 이름"
        maxLength={8}
        aria-label="새 그룹 이름"
      />
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          if (!name.trim()) return
          onAdd(name.trim())
          setName('')
        }}
      >
        + 추가
      </button>
    </span>
  )
}
