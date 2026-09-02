// 가계부 카테고리.
//
// 기본 목록은 코드에 두고, 관리자가 설정에서 고치면 Firestore(settings/categories)의
// 목록이 기준이 된다. 앱이 뜰 때 setCategories() 로 갈아끼운다.
//
// fixed  : 고정비 표시(보험료·전기세 등). 분류용 꼬리표일 뿐, 한도에서 빠지지 않는다.
// offBudget : 관리자가 '한도 제외'로 지정한 카테고리. 이것만 생활비 한도에서 빠진다.

export const DEFAULT_CATEGORIES = [
  // 식생활
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

  // 가족
  { id: 'education', name: '교육', emoji: '📚', group: '가족' },
  { id: 'kids', name: '육아', emoji: '🧸', group: '가족' },
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
]

const index = (list) => new Map(list.map((c) => [c.id, c]))

let active = DEFAULT_CATEGORIES
let byId = index(active)

/** Firestore 에서 읽어온 목록으로 갈아끼운다. 비어 있으면 기본값을 지킨다. */
export function setCategories(list) {
  if (!Array.isArray(list) || list.length === 0) return
  active = list
  byId = index(list)
}

export function getCategories() {
  return active
}

export function categoryGroups(list = active) {
  const groups = []
  for (const c of list) if (!groups.includes(c.group)) groups.push(c.group)
  return groups
}

export function getCategory(id) {
  return byId.get(id) || { id, name: '미분류', emoji: '❓', group: '' }
}

/** 고정비 표시. 분류를 알려 줄 뿐 한도 계산에는 영향이 없다. */
export function isFixedCost(id) {
  return Boolean(byId.get(id)?.fixed)
}

/**
 * 생활비 한도에서 빼는 카테고리.
 * 기본은 '전부 포함' 이고, 관리자가 '한도 제외'로 표시한 것만 빠진다.
 * (고정비·용돈도 생활비에 포함한다 — 사용자 요청)
 */
export function isOffBudget(id) {
  return Boolean(byId.get(id)?.offBudget)
}

/** 한도에서 빠지는 카테고리에만 붙이는 꼬리표. */
export function offBudgetTag(id) {
  return isOffBudget(id) ? '한도 제외' : ''
}

/** 목록·선택기에 붙이는 분류 꼬리표(고정비 표시 포함). */
export function categoryTag(id) {
  const category = byId.get(id)
  if (category?.offBudget) return '한도 제외'
  if (category?.fixed) return '고정비'
  return ''
}

/** 생활비(변동비)에 해당하는 지출인지 — 한도 계산의 기준. */
export function countsTowardBudget(expense) {
  return !isOffBudget(expense.categoryId)
}

/** 새 카테고리 id — 기존 기록의 id 와 겹치지 않도록 시간 기반으로 만든다. */
export function newCategoryId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/** 저장 전에 모양을 다듬는다(빈 이름 제거, 필요한 필드만 남김). */
export function normalizeCategories(list) {
  return list
    .filter((c) => c.name && c.name.trim())
    .map((c) => {
      const item = {
        id: c.id,
        name: c.name.trim(),
        emoji: (c.emoji || '📦').trim(),
        group: (c.group || '생활').trim(),
      }
      if (c.fixed) item.fixed = true
      if (c.offBudget) item.offBudget = true
      return item
    })
}
