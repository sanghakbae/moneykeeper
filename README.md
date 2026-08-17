# 머니키퍼 — 우리 가족 가계부

모바일 전용 가계부. 지출을 건건이 기록하고 일별·월별·분기별·반기별·연별 그래프로 본다.
관리자(아빠)가 매월 생활비 한도와 가족별 용돈을 정하고, 한도의 30% 이하가 남으면 경고한다.

- 배포: https://moneykeeper.sanghak.kr (GitHub Pages)
- 저장소: Firestore (`moneykeeper-1c328`). 모든 데이터는 Firestore 에만 저장한다.

## 계정

로그인해야 어떤 화면도 열리지 않는다. 아이디로 로그인하며, 내부적으로
`아이디@moneykeeper.sanghak.kr` 이메일로 변환해 Firebase Auth 를 쓴다.

| 아이디 | 표시 이름 | 권한 |
|---|---|---|
| brpark | 엄마 | 일반 |
| shbae | 아빠 | 관리자 (한도·용돈 설정, 전체 기록 삭제) |
| hgbae | 아들 | 일반 |

계정 생성/비밀번호 확인:

```bash
SEED_PASSWORD='...' npm run seed
```

비밀번호 변경 (계정마다 다를 수 있다):

```bash
MK_USERNAME=shbae OLD_PASSWORD='...' NEW_PASSWORD='...' npm run set-password
```

## 개발

```bash
npm install
npm run dev     # http://localhost:5180
npm test        # 기간 버킷·집계·한도 계산 검증
npm run build
```

로그인 없이 화면만 확인하려면 `http://localhost:5180/preview.html` — 가짜 데이터로 네 화면을
그대로 띄운다. 엔트리가 `index.html` 하나라 배포 빌드에는 들어가지 않는다.

`.env` 에 `VITE_FIREBASE_*` 가 있어야 동작한다 (`.env.example` 참고).

## 데이터 모델

- `expenses/{id}` — `{ uid, username, amount, categoryId, memo, date:'YYYY-MM-DD', reaction, createdMs, createdAt }`
  - `memo` 는 필수 입력이다. `reaction` 은 `'like' | 'dislike' | null` 로, 잘 쓴 돈/아까운 돈 표시다.
- `budgets/{YYYY-MM}` — `{ limit, allowances: { username: number }, updatedBy, updatedAt }`

보안 규칙(`firestore.rules`)은 등록된 세 계정만 읽고 쓰게 하고, 수정·삭제는 본인 기록만
(관리자는 전체) 허용한다. 예외로 `reaction` 필드만 바꾸는 수정은 가족 누구나 할 수 있다.
한도 설정과 카테고리 편집은 관리자만 쓸 수 있다.

## 한도 계산 규칙

- **고정비는 한도에서 뺀다** — 관리비/월세·전기세·가스비·수도세·통신비·구독료·보험료·대출이자·세금·저축.
  카테고리 정의(`src/lib/categories.js`)의 `fixed: true` 가 기준이다.
- **용돈을 정한 사람의 지출은 그 사람 용돈 한도로만 계산**하고 가족 생활비 한도에서는 뺀다
  (중복 집계 방지).
- 사용률 70% 이상(= 30% 이하 남음)이면 경고, 100% 이상이면 초과 경고.

## 배포

`main` 에 push 하면 GitHub Actions 가 빌드 후 Pages 로 올린다.
Firebase 웹 설정은 저장소 Variables (`VITE_FIREBASE_*`) 로 주입한다.
