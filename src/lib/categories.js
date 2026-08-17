// 가계부 카테고리 정의.
//
// fixed: true 인 카테고리는 "고정비" — 매월 나가는 금액이 정해져 있어 생활비 한도
// 계산에서 제외한다(보험료·전기세·가스비·관리비 등). 사용자 요청 사항이다.

export const CATEGORIES = [
  // 먹는 것
  { id: 'food', name: '식비', emoji: '🍚', group: '식생활' },
  { id: 'coffee', name: '커피/음료', emoji: '☕', group: '식생활' },
  { id: 'dining', name: '외식', emoji: '🍽️', group: '식생활' },
  { id: 'delivery', name: '배달', emoji: '🛵', group: '식생활' },
  { id: 'grocery', name: '마트/장보기', emoji: '🛒', group: '식생활' },
  { id: 'kurly', name: '컬리', emoji: '🥬', group: '식생활' },
  { id: 'coupang', name: '쿠팡', emoji: '🚀', group: '식생활' },
  { id: 'toss', name: '토스', emoji: '💸', group: '식생활' },
  { id: 'convenience', name: '편의점', emoji: '🏪', group: '식생활' },
  { id: 'snack', name: '간식', emoji: '🍪', group: '식생활' },

  // 이동
  { id: 'transit', name: '교통', emoji: '🚌', group: '이동' },
  { id: 'taxi', name: '택시', emoji: '🚕', group: '이동' },
  { id: 'fuel', name: '주유', emoji: '⛽', group: '이동' },
  { id: 'car', name: '자동차', emoji: '🚗', group: '이동' },

  // 생활
  { id: 'household', name: '생활용품', emoji: '🧻', group: '생활' },
  { id: 'clothing', name: '의류', emoji: '👕', group: '생활' },
  { id: 'beauty', name: '미용', emoji: '💇', group: '생활' },
  { id: 'medical', name: '의료/건강', emoji: '💊', group: '생활' },
  { id: 'pet', name: '반려동물', emoji: '🐶', group: '생활' },

  // 여가
  { id: 'culture', name: '문화/여가', emoji: '🎬', group: '여가' },
  { id: 'hobby', name: '취미', emoji: '🎮', group: '여가' },
  { id: 'travel', name: '여행', emoji: '✈️', group: '여가' },
  { id: 'sports', name: '운동', emoji: '🏋️', group: '여가' },

  // 가족
  { id: 'education', name: '교육', emoji: '📚', group: '가족' },
  { id: 'kids', name: '육아', emoji: '🧸', group: '가족' },
  { id: 'allowance', name: '용돈', emoji: '🧧', group: '가족' },
  { id: 'event', name: '경조사', emoji: '🎁', group: '가족' },
  { id: 'gift', name: '선물', emoji: '💝', group: '가족' },

  // 고정비 — 생활비 한도에서 제외
  { id: 'rent', name: '관리비/월세', emoji: '🏠', group: '고정비', fixed: true },
  { id: 'electricity', name: '전기세', emoji: '💡', group: '고정비', fixed: true },
  { id: 'gas', name: '가스비', emoji: '🔥', group: '고정비', fixed: true },
  { id: 'water', name: '수도세', emoji: '🚰', group: '고정비', fixed: true },
  { id: 'telecom', name: '통신비', emoji: '📱', group: '고정비', fixed: true },
  { id: 'subscription', name: '구독료', emoji: '▶️', group: '고정비', fixed: true },
  { id: 'insurance', name: '보험료', emoji: '🛡️', group: '고정비', fixed: true },
  { id: 'loan', name: '대출/이자', emoji: '🏦', group: '고정비', fixed: true },
  { id: 'tax', name: '세금', emoji: '🧾', group: '고정비', fixed: true },
  { id: 'saving', name: '저축/투자', emoji: '💰', group: '고정비', fixed: true },

  { id: 'etc', name: '기타', emoji: '📦', group: '기타' },
]

export const CATEGORY_GROUPS = ['식생활', '이동', '생활', '여가', '가족', '고정비', '기타']

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id) {
  return BY_ID.get(id) || { id, name: id || '미분류', emoji: '❓', group: '기타' }
}

export function isFixedCost(id) {
  return Boolean(BY_ID.get(id)?.fixed)
}

/** 생활비(변동비)에 해당하는 지출인지 — 한도 계산의 기준. */
export function countsTowardBudget(expense) {
  return !isFixedCost(expense.categoryId)
}
