import { formatWon } from '../lib/format.js'

const ICON = { ok: '🟦', warn: '⚠️', over: '⛔' }

/**
 * 한도 미터 — 채움색이 상태(정상/경고/초과)를, 트랙은 같은 램프의 옅은 단계를 쓴다.
 * compact 는 입력 화면용 — 한 줄 + 얇은 바로 줄여 키패드 자리를 남긴다.
 */
export default function BudgetMeter({ label, status, hint, compact }) {
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
  const remainText =
    status.remaining >= 0
      ? `${formatWon(status.remaining)} 남음`
      : `${formatWon(Math.abs(status.remaining))} 초과`

  return (
    <div className={compact ? 'meter compact' : 'meter'} data-level={status.level}>
      <div className="meter-head">
        <span className="label">
          {status.level !== 'ok' && <span aria-hidden="true">{ICON[status.level]}</span>}
          {label}
        </span>
        <span className="nums">
          {compact ? (
            <>
              <b>{percent}%</b> · {remainText}
            </>
          ) : (
            <>
              <b>{formatWon(status.spent)}</b> / {formatWon(status.limit)}
            </>
          )}
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      {!compact && (
        <div className="meter-foot">
          <span>{percent}% 사용</span>
          <span>{remainText}</span>
        </div>
      )}
    </div>
  )
}
