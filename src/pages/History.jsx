import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { categoryTag, getCategory } from '../lib/categories.js'
import { formatDateLabel, formatWon } from '../lib/format.js'
import { monthTitle, shiftMonth } from '../lib/periods.js'
import { removeExpense, setReaction, updateExpense } from '../lib/store.js'
import { displayName } from '../lib/accounts.js'
import CategoryPicker from '../components/CategoryPicker.jsx'
import AmountInput from '../components/AmountInput.jsx'

export default function History() {
  const { user, expenses, today, notify } = useApp()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [who, setWho] = useState('all')
  const [editing, setEditing] = useState(null)

  const rows = useMemo(
    () =>
      expenses.filter(
        (e) => e.date.slice(0, 7) === month && (who === 'all' || e.username === who),
      ),
    [expenses, month, who],
  )

  const days = useMemo(() => {
    const map = new Map()
    for (const e of rows) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date).push(e)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [rows])

  const total = rows.reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div className="screen">
      <div className="card">
        <div className="month-nav">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="이전 달">
            ‹
          </button>
          <div style={{ textAlign: 'center' }}>
            <div className="now">{monthTitle(month)}</div>
            <div className="hint">{formatWon(total)} · {rows.length}건</div>
          </div>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="다음 달"
            disabled={month >= today.slice(0, 7)}
            style={{ opacity: month >= today.slice(0, 7) ? 0.35 : 1 }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="seg">
        {[
          { id: 'all', label: '전체' },
          { id: 'brpark', label: '엄마' },
          { id: 'shbae', label: '아빠' },
          { id: 'hgbae', label: '아들' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={who === option.id}
            onClick={() => setWho(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!days.length && <p className="empty-state">이 달에 기록된 지출이 없습니다.</p>}

      {days.map(([date, list]) => (
        <div className="day-group" key={date}>
          <div className="day-head">
            <span>{formatDateLabel(date)}</span>
            <span className="sum">
              {formatWon(list.reduce((sum, e) => sum + (e.amount || 0), 0))}
            </span>
          </div>
          <div className="rows">
            {list.map((expense) => {
              const category = getCategory(expense.categoryId)
              const mine = expense.username === user.username
              return (
                <div className="row" key={expense.id}>
                  <button
                    type="button"
                    className="row-main"
                    onClick={() =>
                      (mine || user.isAdmin)
                        ? setEditing(expense)
                        : notify('내가 쓴 기록만 고칠 수 있어요')}
                  >
                    <span className="emoji" aria-hidden="true">{category.emoji}</span>
                    <span className="title">{category.name}</span>
                    <span className="meta">
                      {displayName(expense.username)}
                      {expense.memo ? ` · ${expense.memo}` : ''}
                      {categoryTag(expense.categoryId)
                        ? ` · ${categoryTag(expense.categoryId)}`
                        : ''}
                    </span>
                    <span className="amount">{formatWon(expense.amount)}</span>
                  </button>
                  <Reactions expense={expense} notify={notify} />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {editing && (
        <EditSheet expense={editing} onClose={() => setEditing(null)} notify={notify} />
      )}
    </div>
  )
}

/** 잘 쓴 돈 / 아까운 돈 표시. 같은 걸 다시 누르면 해제된다. */
function Reactions({ expense, notify }) {
  const [busy, setBusy] = useState(false)

  const toggle = async (value) => {
    if (busy) return
    setBusy(true)
    try {
      await setReaction(expense.id, expense.reaction === value ? null : value)
      if (navigator.vibrate) navigator.vibrate(8)
    } catch (e) {
      notify(e?.message || '표시하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="reactions">
      <button
        type="button"
        aria-pressed={expense.reaction === 'like'}
        aria-label="잘 쓴 돈"
        title="잘 쓴 돈"
        onClick={() => toggle('like')}
      >
        👍
      </button>
      <button
        type="button"
        aria-pressed={expense.reaction === 'dislike'}
        aria-label="아까운 돈"
        title="아까운 돈"
        onClick={() => toggle('dislike')}
      >
        👎
      </button>
    </span>
  )
}

function EditSheet({ expense, onClose, notify }) {
  const [amount, setAmount] = useState(String(expense.amount || ''))
  const [categoryId, setCategoryId] = useState(expense.categoryId)
  const [memo, setMemo] = useState(expense.memo || '')
  const [date, setDate] = useState(expense.date)
  const [busy, setBusy] = useState(false)

  const invalid = !Number(amount) || !categoryId || !memo.trim()

  const save = async () => {
    if (invalid) return notify('금액·카테고리·메모를 모두 채워주세요')
    setBusy(true)
    try {
      await updateExpense(expense.id, {
        amount: Number(amount) || 0,
        categoryId,
        memo: memo.trim(),
        date,
      })
      notify('수정했어요')
      onClose()
    } catch (e) {
      notify(e?.message || '수정하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  const destroy = async () => {
    setBusy(true)
    try {
      await removeExpense(expense.id)
      notify('삭제했어요')
      onClose()
    } catch (e) {
      notify(e?.message || '삭제하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="지출 수정">
        <h3>지출 수정</h3>

        <div className="limit-input">
          <AmountInput value={amount} onChange={setAmount} label="금액" />
          <span>원</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="limit-input"
            style={{ flex: 1, textAlign: 'left' }}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="날짜"
          />
          <input
            className={memo.trim() ? 'limit-input' : 'limit-input needs-input'}
            style={{ flex: 1.2, textAlign: 'left', fontWeight: 400 }}
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (필수)"
            maxLength={40}
            required
            aria-required="true"
            aria-label="메모 (필수)"
          />
        </div>

        <CategoryPicker value={categoryId} onChange={setCategoryId} />

        <button className="btn" type="button" onClick={save} disabled={busy || invalid}>
          저장
        </button>
        <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
          취소
        </button>
        <button className="btn danger" type="button" onClick={destroy} disabled={busy}>
          삭제
        </button>
      </div>
    </div>
  )
}
