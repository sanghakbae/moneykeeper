import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  isFirebaseConfigured,
  onAuthChange,
  signIn,
  signOutUser,
  subscribeBudgets,
  subscribeCategories,
  subscribeExpenses,
} from '../lib/store.js'
import { todayISO } from '../lib/format.js'
import { DEFAULT_CATEGORIES, setCategories } from '../lib/categories.js'

const Ctx = createContext(null)

// 개발용 미리보기(로그인 없이 화면만 확인)에서 가짜 값을 넣기 위해 열어둔다.
export const AppContext = Ctx

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [budgets, setBudgets] = useState({})
  const [categories, setCategoryList] = useState(DEFAULT_CATEGORIES)
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
    const unsubCategories = subscribeCategories((items) => {
      // 저장된 목록이 없으면 코드의 기본값을 그대로 쓴다.
      const next = items && items.length ? items : DEFAULT_CATEGORIES
      setCategories(next) // 모듈 레지스트리 먼저 — getCategory() 가 바로 새 목록을 본다
      setCategoryList(next)
    }, (e) => setDataError(readError(e)))
    return () => {
      unsubExpenses()
      unsubBudgets()
      unsubCategories()
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
      categories,
      dataError,
      toast,
      notify: setToast,
      today: todayISO(),
      isFirebaseConfigured,
      login: signIn,
      logout: signOutUser,
    }),
    [user, authReady, expenses, budgets, categories, dataError, toast],
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
