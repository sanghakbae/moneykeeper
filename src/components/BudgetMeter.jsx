import { formatWon } from '../lib/format.js'

const ICON = { ok: '🟦', warn: '⚠️', over: '⛔' }

/** 한도 미터 — 채움색이 상태(정상/경고/초과)를, 트랙은 같은 램프의 옅은 단계를 쓴다. */
export default function BudgetMeter({ label, status, hint }) {
  if (status.level === 'none') {
    return (
      <div className="meter" data-level="none">
        <div className="meter-head">
          <span className="label">{label}</span>
          <span className="nums">{hint || '한도 미설정'}</span>
        </div>
      </div>
    )
  }

  const percent = Math.round(status.ratio * 100)
  return (
    <div className="meter" data-level={status.level}>
      <div className="meter-head">
        <span className="label">
          {status.level !== 'ok' && <span aria-hidden="true">{ICON[status.level]}</span>}
          {label}
        </span>
        <span className="nums">
          <b>{formatWon(status.spent)}</b> / {formatWon(status.limit)}
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="meter-foot">
        <span>{percent}% 사용</span>
        <span>
          {status.remaining >= 0
            ? `${formatWon(status.remaining)} 남음`
            : `${formatWon(Math.abs(status.remaining))} 초과`}
        </span>
      </div>
    </div>
  )
}
