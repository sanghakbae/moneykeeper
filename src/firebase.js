// Firebase 초기화. VITE_FIREBASE_* 가 없으면 초기화하지 않고 로컬 저장소 모드로 동작한다.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

/** 여러 앱이 한 Firebase 프로젝트를 공유할 때 컬렉션을 분리하기 위한 접두사. */
export const COLLECTION_PREFIX = env.VITE_COLLECTION_PREFIX || ''

export const collectionName = (name) => `${COLLECTION_PREFIX}${name}`

let app = null
let auth = null
let db = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)

  // 오프라인 캐시. 비행기 모드에서도 지난 내역을 보고 새 지출을 적을 수 있고,
  // 연결되면 Firestore 가 알아서 밀어 넣는다. 저장소는 여전히 Firestore 하나다.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
}

export { app, auth, db }
