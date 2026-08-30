import { applyUpdate } from '../lib/pwa.js'

/**
 * 새 버전 알림.
 * 자동으로 새로고침하지 않는다 — 입력 중이던 내용이 날아가기 때문에,
 * 사용자가 누를 때만 교체한다.
 */
export default function UpdateBanner({ onDismiss }) {
  return (
    <div className="update-banner" role="status">
      <span className="icon" aria-hidden="true">✨</span>
      <div className="body">
        <div className="t">새 버전이 있어요</div>
        <div className="d">입력 중인 내용이 있으면 저장한 뒤 눌러주세요</div>
      </div>
      <button type="button" className="later" onClick={onDismiss}>
        나중에
      </button>
      <button type="button" className="now" onClick={applyUpdate}>
        업데이트
      </button>
    </div>
  )
}
