const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '←']
const QUICK = [1000, 5000, 10000, 50000]

/** 모바일 전용 금액 입력 — OS 키보드가 화면을 가리지 않도록 자체 키패드를 쓴다. */
export default function Keypad({ value, onChange }) {
  const press = (key) => {
    if (navigator.vibrate) navigator.vibrate(8)
    if (key === '←') return onChange(value.slice(0, -1))
    const next = (value + key).replace(/^0+(?=\d)/, '')
    if (next.length > 10) return undefined
    return onChange(next)
  }

  const addQuick = (amount) => {
    if (navigator.vibrate) navigator.vibrate(8)
    onChange(String((Number(value) || 0) + amount))
  }

  return (
    <>
      <div className="quick-amounts">
        {QUICK.map((amount) => (
          <button key={amount} type="button" onClick={() => addQuick(amount)}>
            +{amount >= 10000 ? `${amount / 10000}만` : `${amount / 1000}천`}
          </button>
        ))}
      </div>
      <div className="keypad">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={key.length > 1 ? 'wide' : ''}
            onClick={() => press(key)}
            aria-label={key === '←' ? '지우기' : key}
          >
            {key}
          </button>
        ))}
      </div>
    </>
  )
}
