// 데이터 계층 — 저장소는 Firestore 하나뿐이다.
// 지출·한도·용돈 모두 Firestore 에 들어가며, 브라우저에 남기는 사본은 없다.

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

import { auth, collectionName, db, isFirebaseConfigured } from '../firebase.js'
import { emailToUsername, findAccount, usernameToEmail } from './accounts.js'

function assertConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase 설정(.env)이 없습니다. VITE_FIREBASE_* 값을 채워주세요.')
  }
}

/* ----------------------------------- 인증 ------------------------------------ */

function toUser({ uid, username }) {
  const account = findAccount(username)
  return {
    uid,
    username,
    name: account?.name || username,
    emoji: account?.emoji || '🙂',
    isAdmin: account?.role === 'admin',
    known: Boolean(account),
  }
}

export function onAuthChange(callback) {
  if (!isFirebaseConfigured) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, (user) => {
    if (!user) return callback(null)
    callback(toUser({ uid: user.uid, username: emailToUsername(user.email) }))
  })
}

export async function signIn(username, password) {
  assertConfigured()
  const account = findAccount(username)
  if (!account) throw new Error('등록되지 않은 아이디입니다.')
  try {
    const cred = await signInWithEmailAndPassword(auth, usernameToEmail(account.username), password)
    return toUser({ uid: cred.user.uid, username: account.username })
  } catch (error) {
    throw new Error(authMessage(error))
  }
}

function authMessage(error) {
  const code = error?.code || ''
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return '아이디 또는 비밀번호가 맞지 않습니다.'
  }
  if (code.includes('user-not-found')) return '계정이 아직 만들어지지 않았습니다.'
  if (code.includes('too-many-requests')) return '시도가 너무 잦습니다. 잠시 후 다시 해주세요.'
  if (code.includes('operation-not-allowed')) {
    return 'Firebase 콘솔에서 이메일/비밀번호 로그인을 켜주세요.'
  }
  if (code.includes('network')) return '네트워크 연결을 확인해주세요.'
  return '로그인에 실패했습니다.'
}

export async function signOutUser() {
  assertConfigured()
  await signOut(auth)
}

/* ---------------------------------- 지출 내역 ---------------------------------- */

function sortExpenses(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return (b.createdMs || 0) - (a.createdMs || 0)
  })
}

export function subscribeExpenses(callback, onError) {
  if (!isFirebaseConfigured) {
    onError?.(new Error('Firebase 설정이 없습니다.'))
    return () => {}
  }
  const q = query(collection(db, collectionName('expenses')), orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(sortExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (error) => onError?.(error),
  )
}

export async function addExpense(user, entry) {
  assertConfigured()
  await addDoc(collection(db, collectionName('expenses')), {
    uid: user.uid,
    username: user.username,
    amount: Number(entry.amount),
    categoryId: entry.categoryId,
    memo: entry.memo || '',
    date: entry.date,
    createdMs: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function updateExpense(id, patch) {
  assertConfigured()
  await updateDoc(doc(db, collectionName('expenses'), id), patch)
}

export async function removeExpense(id) {
  assertConfigured()
  await deleteDoc(doc(db, collectionName('expenses'), id))
}

/* ----------------------------------- 한도 ------------------------------------ */

export function subscribeBudgets(callback, onError) {
  if (!isFirebaseConfigured) {
    onError?.(new Error('Firebase 설정이 없습니다.'))
    return () => {}
  }
  return onSnapshot(
    collection(db, collectionName('budgets')),
    (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        map[d.id] = d.data()
      })
      callback(map)
    },
    (error) => onError?.(error),
  )
}

export async function saveBudget(month, data, user) {
  assertConfigured()
  // merge 를 쓰면 안 된다 — 중첩 맵은 키 단위로 병합돼서, 지운 용돈이 되살아난다.
  // 설정 시트가 항상 문서 전체(한도 + 용돈)를 보내므로 통째로 덮어쓴다.
  await setDoc(doc(db, collectionName('budgets'), month), {
    limit: Number(data.limit) || 0,
    allowances: data.allowances || {},
    updatedBy: user?.username || '',
    updatedMs: Date.now(),
    updatedAt: serverTimestamp(),
  })
}

/* ---------------------------------- 카테고리 ---------------------------------- */

// settings/categories 한 문서에 배열로 담는다. 목록이 작아 통째로 읽고 쓰는 편이 단순하다.

export function subscribeCategories(callback, onError) {
  if (!isFirebaseConfigured) {
    onError?.(new Error('Firebase 설정이 없습니다.'))
    return () => {}
  }
  return onSnapshot(
    doc(db, collectionName('settings'), 'categories'),
    (snap) => callback(snap.exists() ? snap.data().items || [] : null),
    (error) => onError?.(error),
  )
}

export async function saveCategories(items, user) {
  assertConfigured()
  await setDoc(doc(db, collectionName('settings'), 'categories'), {
    items,
    updatedBy: user?.username || '',
    updatedMs: Date.now(),
    updatedAt: serverTimestamp(),
  })
}

export { isFirebaseConfigured }
