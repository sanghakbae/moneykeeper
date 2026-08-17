import { useMemo, useState } from 'react'
import CategoryPicker from '../components/CategoryPicker.jsx'
import Keypad from '../components/Keypad.jsx'
import AlertBanner from '../components/AlertBanner.jsx'
import BudgetMeter from '../components/BudgetMeter.jsx'
import { useApp } from '../context/AppContext.jsx'
import { addExpense } from '../lib/store.js'
import { formatNumber, formatWon, todayISO } from '../lib/format.js'
import { budgetAlerts, monthlyBudgetReport } from '../lib/stats.js'
import { displayName } from '../lib/accounts.js'
import { isOffBudget, offBudgetTag } from '../lib/categories.js'

export default function Add() {
  const { user, expenses, budgets, notify, today } = useApp()
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(today || todayISO())
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const month = date.slice(0, 7)
  const report = useMemo(
    () => monthlyBudgetReport(expenses, month, budgets[month]),
    [expenses, month, budgets],
  )
  const alerts = useMemo(() => budgetAlerts(report, displayName), [report])

  const myAllowance = report.allowances.find((a) => a.username === user.username)
  const meter = myAllowance
    ? { label: `${user.name} 용돈`, status: myAllowance }
    : { label: '이번 달 생활비', status: report.household }

  const todayTotal = expenses
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  const save = async () => {
    const value = Number(amount)
    if (!value || value <= 0) return setError('금액을 입력해주세요.')
    if (!categoryId) return setError('카테고리를 골라주세요.')
    setError('')
    setBusy(true)
    try {
      await addExpense(user, { amount: value, categoryId, memo, date })
      notify(`${formatWon(value)} 저장했어요`)
      setAmount('')
      setMemo('')
    } catch (e) {
      setError(e?.message || '저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
    return undefined
  }

  return (
    <div className="screen">
      <AlertBanner alerts={alerts} />

      <div className="card">
        <BudgetMeter
          {...meter}
          hint={user.isAdmin ? '설정 탭에서 정하기' : '한도 미설정'}
        />
      </div>

      <div className="amount-display">
        <span className="hint">
          {date === (today || todayISO()) ? '오늘' : date} {formatWon(todayTotal)}
        </span>
        <span className={amount ? 'value' : 'value empty'}>
          {amount ? formatNumber(Number(amount)) : '0'}
          <span className="unit">원</span>
        </span>
      </div>

      <CategoryPicker value={categoryId} onChange={setCategoryId} />

      {categoryId && isOffBudget(categoryId) && (
        <p className="hint">{offBudgetTag(categoryId)}라 생활비 한도에는 포함되지 않습니다.</p>
      )}

      <div className="card" style={{ display: 'flex', gap: 8 }}>
        <input
          className="limit-input"
          style={{ flex: 1, textAlign: 'left' }}
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          aria-label="날짜"
        />
        <input
          className="limit-input"
          style={{ flex: 1.2, textAlign: 'left', fontWeight: 400 }}
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          maxLength={40}
          aria-label="메모"
        />
      </div>

      <Keypad value={amount} onChange={setAmount} />

      {error && (
        <p className="error">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}

      <button className="btn" type="button" onClick={save} disabled={busy}>
        {busy ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}
