import { useState } from 'react'
import { ACCOUNTS } from '../lib/accounts.js'
import { useApp } from '../context/AppContext.jsx'

export default function Login() {
  const { login } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = ACCOUNTS.find((a) => a.username === username)

  const pick = (account) => {
    setUsername(account.username)
    setError('')
    if (navigator.vibrate) navigator.vibrate(8)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!selected) return setError('누구인지 먼저 골라주세요.')
    if (!password) return setError('비밀번호를 입력해주세요.')
    setError('')
    setBusy(true)
    try {
      await login(username, password)
    } catch (e) {
      setError(e.message)
      setPassword('')
    } finally {
      setBusy(false)
    }
    return undefined
  }

  return (
    <div className="login-page">
      <div className="login-glow" aria-hidden="true" />

      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="login-mark" aria-hidden="true">💰</div>
          <h1>머니키퍼</h1>
          <p>우리 가족 가계부</p>
        </div>

        <div className="who-picker" role="radiogroup" aria-label="사용자 선택">
          {ACCOUNTS.map((account) => (
            <button
              key={account.username}
              type="button"
              className="who-card"
              role="radio"
              aria-checked={username === account.username}
              onClick={() => pick(account)}
            >
              <span className="avatar" aria-hidden="true">{account.emoji}</span>
              <span className="nm">{account.name}</span>
              <span className="id">{account.username}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          name="username"
          autoComplete="username"
          value={username}
          readOnly
          hidden
        />

        <div className={selected ? 'pw-wrap' : 'pw-wrap off'}>
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={selected ? `${selected.name} 비밀번호` : '먼저 위에서 골라주세요'}
            disabled={!selected}
            aria-label="비밀번호"
          />
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
            disabled={!selected}
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>

        {error && (
          <p className="error" role="alert">
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        )}

        <button className="btn login-btn" type="submit" disabled={busy || !selected || !password}>
          {busy ? '확인 중…' : '로그인'}
        </button>

        <p className="login-foot">등록된 가족 계정만 사용할 수 있습니다</p>
      </form>
    </div>
  )
}
