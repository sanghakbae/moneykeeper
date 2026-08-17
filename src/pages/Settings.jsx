import { useEffect, useMemo, useState } from 'react'
import BudgetMeter from '../components/BudgetMeter.jsx'
import AlertBanner from '../components/AlertBanner.jsx'
import { useApp } from '../context/AppContext.jsx'
import { ACCOUNTS, displayName } from '../lib/accounts.js'
import { formatNumber, formatWon } from '../lib/format.js'
import { monthTitle, shiftMonth } from '../lib/periods.js'
import { budgetAlerts, monthlyBudgetReport } from '../lib/stats.js'
import { saveBudget } from '../lib/store.js'

export default function Settings() {
  const { user, expenses, budgets, today, notify, logout } = useApp()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [editing, setEditing] = useState(false)

  const budget = budgets[month]
  const report = useMemo(
    () => monthlyBudgetReport(expenses, month, budget),
    [expenses, month, budget],
  )
  const alerts = useMemo(() => budgetAlerts(report, displayName), [report])

  return (
    <div className="screen">
      <div className="card">
        <div className="section-title">
          <span>내 계정</span>
        </div>
        <div className="member-row">
          <span className="who">
            <span aria-hidden="true">{user.emoji}</span> {user.name}
          </span>
          <span className="hint">
            {user.username}
            {user.isAdmin ? ' · 관리자' : ''}
          </span>
        </div>
      </div>

      <AlertBanner alerts={alerts} />

      <div className="card">
        <div className="month-nav" style={{ marginBottom: 12 }}>
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="이전 달">
            ‹
          </button>
          <div className="now">{monthTitle(month)} 한도</div>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="다음 달">
            ›
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BudgetMeter
            label="생활비 (고정비 제외)"
            status={report.household}
            hint={user.isAdmin ? '아래에서 한도를 정할 수 있어요.' : '아빠만 한도를 정할 수 있어요.'}
          />
          {report.allowances.map((a) => (
            <BudgetMeter key={a.username} label={`${displayName(a.username)} 용돈`} status={a} />
          ))}
        </div>

        <p className="hint" style={{ marginTop: 12 }}>
          이번 달 고정비 {formatWon(report.fixedTotal)}는 한도 계산에서 빠집니다 (보험료·전기세·가스비·관리비 등).
          한도의 30% 이하가 남으면 경고가 표시됩니다.
        </p>

        {user.isAdmin && (
          <button
            className="btn"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => setEditing(true)}
          >
            한도·용돈 설정
          </button>
        )}
      </div>

      <div className="card">
        <div className="section-title">
          <span>가족</span>
        </div>
        {ACCOUNTS.map((account) => (
          <div className="member-row" key={account.username} style={{ padding: '6px 0' }}>
            <span className="who">
              <span aria-hidden="true">{account.emoji}</span> {account.name}
            </span>
            <span className="hint">
              {account.username}
              {account.role === 'admin' ? ' · 관리자' : ''}
            </span>
          </div>
        ))}
      </div>

      <button className="btn ghost" type="button" onClick={logout}>
        로그아웃
      </button>

      {editing && (
        <BudgetSheet
          month={month}
          budget={budget}
          user={user}
          notify={notify}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

function BudgetSheet({ month, budget, user, notify, onClose }) {
  const [limit, setLimit] = useState(String(budget?.limit || ''))
  const [allowances, setAllowances] = useState(() => {
    const initial = {}
    for (const account of ACCOUNTS) {
      initial[account.username] = String(budget?.allowances?.[account.username] || '')
    }
    return initial
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLimit(String(budget?.limit || ''))
  }, [budget])

  const save = async () => {
    setBusy(true)
    try {
      const cleaned = {}
      for (const [username, value] of Object.entries(allowances)) {
        const amount = Number(value) || 0
        if (amount > 0) cleaned[username] = amount
      }
      await saveBudget(month, { limit: Number(limit) || 0, allowances: cleaned }, user)
      notify(`${monthTitle(month)} 한도를 저장했어요`)
      onClose()
    } catch (e) {
      notify(e?.message || '저장하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="한도 설정">
        <h3>{monthTitle(month)} 한도</h3>

        <div>
          <div className="section-title">
            <span>월 생활비 한도</span>
          </div>
          <div className="limit-input">
            <input
              type="number"
              inputMode="numeric"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0"
              aria-label="월 생활비 한도"
            />
            <span>원</span>
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            {limit ? `${formatNumber(Number(limit))}원` : '0원'} · 보험료·전기세·가스비·관리비 등
            고정비는 빼고 계산합니다.
          </p>
        </div>

        <div>
          <div className="section-title">
            <span>용돈</span>
          </div>
          {ACCOUNTS.map((account) => (
            <div className="member-row" key={account.username} style={{ marginBottom: 8 }}>
              <span className="who">
                <span aria-hidden="true">{account.emoji}</span> {account.name}
              </span>
              <div className="limit-input" style={{ flex: 1 }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={allowances[account.username]}
                  onChange={(e) =>
                    setAllowances((prev) => ({ ...prev, [account.username]: e.target.value }))}
                  placeholder="0"
                  aria-label={`${account.name} 용돈`}
                />
                <span>원</span>
              </div>
            </div>
          ))}
          <p className="hint">
            용돈을 정한 사람의 지출은 용돈 한도로 계산하고, 가족 생활비 한도에서는 빼서 중복으로
            세지 않습니다.
          </p>
        </div>

        <button className="btn" type="button" onClick={save} disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
        <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
          취소
        </button>
      </div>
    </div>
  )
}
