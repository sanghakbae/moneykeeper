/** 한도 경고 — 색만으로 알리지 않도록 아이콘 + 문구를 함께 쓴다. */
export default function AlertBanner({ alerts }) {
  if (!alerts.length) return null
  return (
    <>
      {alerts.map((alert) => (
        <div className="alert" data-level={alert.level} key={alert.title} role="status">
          <span className="icon" aria-hidden="true">
            {alert.level === 'over' ? '⛔' : '⚠️'}
          </span>
          <div>
            <div className="t">{alert.title}</div>
            <div className="d">{alert.detail}</div>
          </div>
        </div>
      ))}
    </>
  )
}
