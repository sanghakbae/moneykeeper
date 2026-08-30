import { useMemo, useState } from 'react'
import CategoryPicker from '../components/CategoryPicker.jsx'
import Keypad from '../components/Keypad.jsx'
import AlertBanner from '../components/AlertBanner.jsx'
import BudgetMeter from '../components/BudgetMeter.jsx'
import { useApp } from '../context/AppContext.jsx'
import { addExpense } from '../lib/store.js'
import { formatNumber, formatWon, josa, todayISO } from '../lib/format.js'
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

  // 금액·카테고리·메모는 모두 필수다. 하나라도 비면 저장 버튼을 막고 무엇이 빠졌는지 알려준다.
  const missing = []
  if (!Number(amount)) missing.push('금액')
  if (!categoryId) missing.push('카테고리')
  if (!memo.trim()) missing.push('메모')

  const save = async () => {
    const value = Number(amount)
    if (!value || value <= 0) return setError('금액을 입력해주세요.')
    if (!categoryId) return setError('카테고리를 골라주세요.')
    if (!memo.trim()) return setError('메모를 입력해주세요.')
    setError('')
    setBusy(true)
    try {
      await addExpense(user, { amount: value, categoryId, memo: memo.trim(), date })
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
      {/* 경고가 뜨면 배너가 사용률과 남은 금액을 이미 말해 준다.
          미터까지 함께 두면 같은 내용이 두 번 나오고, 저장 버튼이 화면 밖으로 밀린다. */}
      <AlertBanner alerts={alerts} />

      {alerts.length === 0 && (
        <div className="card">
          <BudgetMeter
            {...meter}
            compact
            hint={user.isAdmin ? '설정 탭에서 정하기' : '한도 미설정'}
          />
        </div>
      )}

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

      {/* 입력 중인 금액은 키패드 바로 위에 둔다 — 위쪽에 있으면 눈에 안 들어온다 */}
      <div className="amount-display">
        <span className={amount ? 'value' : 'value empty'}>
          {amount ? formatNumber(Number(amount)) : '0'}
          <span className="unit">원</span>
        </span>
      </div>

      <Keypad value={amount} onChange={setAmount} />

      {error && (
        <p className="error">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}

      <button
        className="btn"
        type="button"
        onClick={save}
        disabled={busy || missing.length > 0}
      >
        {busy ? '저장 중…' : '저장'}
      </button>

      {!busy && missing.length > 0 && (
        <p className="hint" style={{ textAlign: 'center' }}>
          {missing.join(' · ')}
          {josa(missing[missing.length - 1], '을', '를')} 입력하면 저장할 수 있어요
        </p>
      )}
    </div>
  )
}
