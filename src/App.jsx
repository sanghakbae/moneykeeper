import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Login from './pages/Login.jsx'
import Add from './pages/Add.jsx'
import History from './pages/History.jsx'
import Stats from './pages/Stats.jsx'
import Settings from './pages/Settings.jsx'

const TABS = [
  { id: 'add', label: '입력', icon: '➕', title: '지출 입력', Page: Add },
  { id: 'history', label: '내역', icon: '📋', title: '지출 내역', Page: History },
  { id: 'stats', label: '통계', icon: '📊', title: '통계', Page: Stats },
  { id: 'settings', label: '설정', icon: '⚙️', title: '설정', Page: Settings },
]

function Shell() {
  const { user, authReady, dataError, toast, isFirebaseConfigured } = useApp()
  const [tab, setTab] = useState('add')

  if (!isFirebaseConfigured) {
    return (
      <div className="login">
        <div className="brand">
          <div className="logo" aria-hidden="true">🔌</div>
          <h1>설정이 필요합니다</h1>
          <p>
            .env 에 VITE_FIREBASE_* 값을 채워주세요. 모든 데이터는 Firestore 에 저장됩니다.
          </p>
        </div>
      </div>
    )
  }

  if (!authReady) {
    return (
      <div className="login">
        <div className="brand">
          <div className="logo" aria-hidden="true">💰</div>
          <p>불러오는 중…</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않으면 어떤 화면도 열리지 않는다.
  if (!user) return <Login />

  if (!user.known) {
    return (
      <div className="login">
        <div className="brand">
          <div className="logo" aria-hidden="true">🚫</div>
          <h1>접근 권한이 없습니다</h1>
          <p>등록된 가족 계정만 사용할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  const current = TABS.find((t) => t.id === tab) || TABS[0]
  const { Page } = current

  return (
    <div className="app">
      <header className="topbar">
        <h1>{current.title}</h1>
        <span className="who">
          <span aria-hidden="true">{user.emoji}</span>
          {user.name}
        </span>
      </header>

      {dataError && (
        <div style={{ padding: '10px 16px 0' }}>
          <div className="banner-local">⚠️ {dataError}</div>
        </div>
      )}

      <Page />

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="ico" aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
