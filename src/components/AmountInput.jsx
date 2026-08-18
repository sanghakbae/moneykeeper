import { formatNumber } from '../lib/format.js'

/**
 * 금액 입력 — 세 자리마다 콤마를 넣어 보여준다.
 * type="number" 는 콤마를 못 넣으므로 text + inputMode="numeric" 을 쓰고
 * 숫자 외 문자는 걸러 낸다. onChange 로는 숫자 문자열만 넘긴다.
 */
export default function AmountInput({ value, onChange, placeholder = '0', label, className }) {
  const digits = String(value ?? '').replace(/\D/g, '')

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={digits ? formatNumber(Number(digits)) : ''}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder}
      aria-label={label}
    />
  )
}
