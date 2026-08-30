import { dismissIosHint } from '../lib/pwa.js'

/**
 * 아이폰용 홈 화면 추가 안내.
 * iOS 사파리에는 설치 버튼이 없어서 직접 알려줘야 한다.
 * 한 번 닫으면 하루 동안 다시 뜨지 않는다.
 */
export default function IosInstallHint({ onClose }) {
  const close = () => {
    dismissIosHint()
    onClose()
  }

  return (
    <div className="ios-hint" role="dialog" aria-label="홈 화면에 추가">
      <div className="head">
        <span className="app-icon" aria-hidden="true">
          <img src="/icons/icon-192.png" alt="" width="34" height="34" />
        </span>
        <div>
          <div className="t">홈 화면에 추가하면 앱처럼 쓸 수 있어요</div>
          <div className="d">주소창 없이 바로 열리고, 오프라인에서도 켜집니다</div>
        </div>
        <button type="button" className="close" onClick={close} aria-label="닫기">
          ✕
        </button>
      </div>

      <ol className="steps">
        <li>
          아래 <b>공유</b> 버튼
          <span className="share-glyph" aria-hidden="true">
            <svg width="13" height="16" viewBox="0 0 24 28" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17V3" />
              <path d="M7 8l5-5 5 5" />
              <path d="M5 12H3v13h18V12h-2" />
            </svg>
          </span>
          을 누르세요
        </li>
        <li>
          목록을 <b>아래로 내려</b> <b>&apos;홈 화면에 추가&apos;</b> 를 누르세요
        </li>
        <li>
          안 보이면 목록 맨 아래 <b>&apos;더 보기&apos;</b> 를 눌러 찾으세요
        </li>
      </ol>
    </div>
  )
}
