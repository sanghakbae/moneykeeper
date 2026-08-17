import { useState } from 'react'
import { ACCOUNTS } from '../lib/accounts.js'
import { useApp } from '../context/AppContext.jsx'

export default function Login() {
  const { login } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <div className="brand">
        <div className="logo" aria-hidden="true">💰</div>
        <h1>머니키퍼</h1>
        <p>우리 가족 가계부</p>
      </div>

      <div className="accounts-hint">
        {ACCOUNTS.map((account) => (
          <button
            key={account.username}
            type="button"
            aria-pressed={username === account.username}
            onClick={() => setUsername(account.username)}
          >
            {account.emoji} {account.name}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="username">아이디</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="brpark"
        />
      </div>

      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="error">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}

      <button className="btn" type="submit" disabled={busy || !username || !password}>
        {busy ? '확인 중…' : '로그인'}
      </button>

      <p className="hint" style={{ textAlign: 'center' }}>
        등록된 가족 계정만 사용할 수 있습니다.
      </p>
    </form>
  )
}
