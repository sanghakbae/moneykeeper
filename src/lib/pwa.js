// 서비스워커 등록과 업데이트 감지.
//
// 새 버전을 발견해도 자동으로 새로고침하지 않는다 — 작성 중이던 입력이 날아간다.
// 화면에 알리고, 사용자가 누를 때만 교체한다.

let waitingWorker = null

export function registerServiceWorker(onUpdateReady) {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return // 개발 서버에서는 캐시가 방해만 된다

  // load 가 이미 끝난 뒤에 호출될 수 있다(useEffect 는 페인트 뒤에 돈다).
  // 그 경우 이벤트를 기다리면 영영 등록되지 않는다.
  if (document.readyState === 'complete') register(onUpdateReady)
  else window.addEventListener('load', () => register(onUpdateReady), { once: true })
}

async function register(onUpdateReady) {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')

    // 이미 대기 중인 새 버전이 있는 경우(다른 탭에서 받아 둔 경우 등)
    if (registration.waiting && navigator.serviceWorker.controller) {
      waitingWorker = registration.waiting
      onUpdateReady()
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        // controller 가 있다는 건 첫 설치가 아니라 '교체 대기' 라는 뜻이다.
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = installing
          onUpdateReady()
        }
      })
    })

    // 앱을 다시 열 때마다 새 버전이 있는지 확인한다.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  } catch {
    // 서비스워커 등록 실패는 앱 동작을 막지 않는다.
  }
}

/** 사용자가 '업데이트' 를 눌렀을 때만 호출한다. */
export function applyUpdate() {
  if (!waitingWorker) {
    window.location.reload()
    return
  }
  // 교체가 끝나면 그때 한 번 새로고침한다.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  }, { once: true })
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
}

/* --------------------------- iOS 홈 화면 추가 안내 --------------------------- */

const IOS_HINT_KEY = 'moneykeeper.iosHintDismissedAt'
const DAY_MS = 24 * 60 * 60 * 1000

export function isIos() {
  const ua = navigator.userAgent || ''
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ 는 데스크톱 사파리로 위장한다.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOS
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/** 아이폰(사파리)에서, 아직 설치 전이고, 하루 안에 닫은 적이 없을 때만 안내한다. */
export function shouldShowIosHint(now = Date.now()) {
  if (!isIos() || isStandalone()) return false
  let dismissedAt = 0
  try {
    dismissedAt = Number(localStorage.getItem(IOS_HINT_KEY)) || 0
  } catch {
    dismissedAt = 0 // 사파리 프라이빗 모드 등에서 접근이 막힐 수 있다
  }
  return now - dismissedAt > DAY_MS
}

export function dismissIosHint(now = Date.now()) {
  try {
    localStorage.setItem(IOS_HINT_KEY, String(now))
  } catch {
    // 저장이 막히면 이번 세션에서만 숨겨진다.
  }
}
