// 개발용 미리보기 — 로그인 없이 실제 화면 컴포넌트를 가짜 데이터로 띄운다.
// http://localhost:5180/preview.html  (배포에는 포함하지 않는다)

import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppContext } from './context/AppContext.jsx'
import Add from './pages/Add.jsx'
import History from './pages/History.jsx'
import Stats from './pages/Stats.jsx'
import Settings from './pages/Settings.jsx'
import { DEFAULT_CATEGORIES } from './lib/categories.js'
import './styles.css'

const today = '2026-08-17'

const expenses = [
  { id: '1', uid: 'u1', username: 'shbae', amount: 11380, categoryId: 'toss', memo: '바른 돼지국밥 5팩', date: '2026-08-17', reaction: 'like' },
  { id: '2', uid: 'u1', username: 'shbae', amount: 4800, categoryId: 'coffee', memo: '스타벅스 아메리카노', date: '2026-08-17' },
  { id: '3', uid: 'u2', username: 'brpark', amount: 132000, categoryId: 'grocery', memo: '주말 장보기', date: '2026-08-16', reaction: 'dislike' },
  { id: '4', uid: 'u3', username: 'hgbae', amount: 68000, categoryId: 'dining', memo: '친구들이랑 저녁', date: '2026-08-15' },
  { id: '5', uid: 'u1', username: 'shbae', amount: 450000, categoryId: 'rent', memo: '8월 관리비', date: '2026-08-01' },
]

const value = {
  user: { uid: 'u1', username: 'shbae', name: '아빠', emoji: '👨', isAdmin: true, known: true },
  authReady: true,
  expenses,
  budgets: { '2026-08': { limit: 1500000, allowances: { hgbae: 150000 } } },
  categories: DEFAULT_CATEGORIES,
  dataError: '',
  toast: '',
  notify: () => {},
  today,
  isFirebaseConfigured: true,
  login: async () => {},
  logout: () => {},
}

const TABS = [
  { id: 'add', label: '입력', icon: '➕', Page: Add },
  { id: 'history', label: '내역', icon: '📋', Page: History },
  { id: 'stats', label: '통계', icon: '📊', Page: Stats },
  { id: 'settings', label: '설정', icon: '⚙️', Page: Settings },
]

function Preview() {
  const [tab, setTab] = useState('add')
  const { Page } = TABS.find((t) => t.id === tab)
  return (
    <AppContext.Provider value={value}>
      <div className="app">
        <header className="topbar">
          <h1>미리보기 · {TABS.find((t) => t.id === tab).label}</h1>
          <span className="who">👨 아빠</span>
        </header>
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
      </div>
    </AppContext.Provider>
  )
}

createRoot(document.getElementById('root')).render(<Preview />)
