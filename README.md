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

`.env` 에 `VITE_FIREBASE_*` 가 있어야 동작한다 (`.env.example` 참고).

## 데이터 모델

- `expenses/{id}` — `{ uid, username, amount, categoryId, memo, date:'YYYY-MM-DD', reaction, createdMs, createdAt }`
  - `memo` 는 필수 입력이다. `reaction` 은 `'like' | 'dislike' | null` 로, 잘 쓴 돈/아까운 돈 표시다.
- `budgets/{YYYY-MM}` — `{ limit, allowances: { username: number }, updatedBy, updatedAt }`

보안 규칙(`firestore.rules`)은 등록된 세 계정만 읽고 쓰게 하고, 수정·삭제는 본인 기록만
(관리자는 전체) 허용한다. 예외로 `reaction` 필드만 바꾸는 수정은 가족 누구나 할 수 있다.
한도 설정과 카테고리 편집은 관리자만 쓸 수 있다.

## 한도 계산 규칙

**한도는 생활비만 센다.** 고정비와 용돈은 한도에서 빠지고 통계에만 반영된다.

| 항목 | 한도 | 통계 |
|---|---|---|
| 생활비 (비고정 지출) | 차감 | 포함 |
| 고정비 (`fixed`) | 차감 안 함 | 포함 |
| 용돈 (관리자 지정액) | 차감 안 함 | 참고 표시 |
| `한도 제외` 표시 (`offBudget`) | 차감 안 함 | 제외 |

- 고정비도 **입력 화면에서 그대로 등록**한다. 게이지에 안 들어갈 뿐이다.
- 용돈은 준 순간 다 쓴 것으로 보고 지정액을 적어 두지만, 생활비 한도를 깎지 않는다.
- 사용률 70% 이상(= 30% 이하 남음)이면 경고, 100% 이상이면 초과 경고. 경고 대상은
  생활비뿐이다.

## 배포

`main` 에 push 하면 GitHub Actions 가 빌드 후 Pages 로 올린다.
Firebase 웹 설정은 저장소 Variables (`VITE_FIREBASE_*`) 로 주입한다.

## 홈 화면 앱(PWA)

스토어 등록 없이 홈 화면에 설치된다. 사이트를 그대로 감싸는 방식이라 화면 코드는 하나다.

- **아이콘은 `assets/icon.svg` 하나가 원본**이다. 색·모양을 바꾸고 `npm run icons` 를 돌리면
  192·512·maskable·iOS 180·파비콘(32/16)이 전부 다시 만들어진다. 빌드에도 포함돼 있다.
- **서비스워커**는 `scripts/build-sw.mjs` 가 빌드 뒤에 생성한다. 해시가 붙은 파일명을 빌드
  전에는 알 수 없기 때문이다. 앱 껍데기를 프리캐시해 네트워크가 없어도 앱이 열린다.
- **새 버전은 자동으로 적용하지 않는다.** 화면 아래에 알림을 띄우고 사용자가 누를 때만
  교체한다. 자동 새로고침은 작성 중이던 입력을 날린다.
- **아이폰에는 설치 버튼이 없어** 공유 → 홈 화면에 추가 안내를 띄운다. 닫으면 하루 동안
  다시 뜨지 않는다(`test/pwa.test.js` 로 고정).

### 입력칸 글자 크기 규칙

iOS 사파리는 **16px 미만** 입력칸에 포커스가 가면 화면을 통째로 확대한다. 확대 자체를 막는
`user-scalable=no` / `maximum-scale` 은 쓰지 않는다(확대해서 보는 사람을 막는다).
대신 입력칸 전용 토큰 `--input-font: 16px` 를 두고 모든 input/select/textarea 가 이 값을 쓴다.

모바일 글자 크기를 줄일 때 입력칸이 딸려 내려가는 일이 잦아 `test/css.test.js` 가 회귀를 막는다.
16px 미만으로 내리거나 viewport 에 확대 차단 속성을 넣으면 테스트가 깨진다.
