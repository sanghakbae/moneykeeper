import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  isFirebaseConfigured,
  onAuthChange,
  signIn,
  signOutUser,
  subscribeBudgets,
  subscribeExpenses,
} from '../lib/store.js'
import { todayISO } from '../lib/format.js'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [budgets, setBudgets] = useState({})
  const [dataError, setDataError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => onAuthChange((u) => {
    setUser(u)
    setAuthReady(true)
    if (!u) {
      setExpenses([])
      setBudgets({})
    }
  }), [])

  // 로그인한 뒤에만 구독한다 — 보안 규칙상 비로그인 상태에서는 읽히지 않는다.
  useEffect(() => {
    if (!user) return undefined
    setDataError('')
    const unsubExpenses = subscribeExpenses(setExpenses, (e) => setDataError(readError(e)))
    const unsubBudgets = subscribeBudgets(setBudgets, (e) => setDataError(readError(e)))
    return () => {
      unsubExpenses()
      unsubBudgets()
    }
  }, [user])

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(id)
  }, [toast])

  const value = useMemo(
    () => ({
      user,
      authReady,
      expenses,
      budgets,
      dataError,
      toast,
      notify: setToast,
      today: todayISO(),
      isFirebaseConfigured,
      login: signIn,
      logout: signOutUser,
    }),
    [user, authReady, expenses, budgets, dataError, toast],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function readError(error) {
  const code = error?.code || ''
  if (code.includes('permission-denied')) {
    return '데이터를 읽을 권한이 없습니다. Firestore 보안 규칙을 배포했는지 확인해주세요.'
  }
  if (code.includes('unavailable')) return '네트워크가 불안정합니다. 연결을 확인해주세요.'
  return error?.message || '데이터를 불러오지 못했습니다.'
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AppProvider 안에서만 쓸 수 있습니다.')
  return ctx
}

export function useNotify() {
  const { notify } = useApp()
  return useCallback((message) => notify(message), [notify])
}
