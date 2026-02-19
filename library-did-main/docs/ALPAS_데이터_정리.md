# ALPAS 사용 API 정리

현재 프로젝트에서 사용하는 ALPAS API 전부를 정리한 문서입니다.  
실제 호출·매핑: `packages/backend/src/services/alpas-real.service.ts`

---

## 1. 사용 API 요약 (3종)

| API | 메서드 | 용도 | 우리 서비스에서 쓰는 곳 |
|-----|--------|------|------------------------|
| **AE117.do** | GET | 특정 기간 **신착자료** | 신착 도서 목록, 도서 상세 fallback |
| **AD201.do** | GET / POST | **도서 검색**·목록 | 검색, 연령별, 사서추천, 도서 상세 fallback |
| **AD206.do** | GET | **도서 상세** (책키 1건) | 도서 상세 조회 (1순위) |

**Base URL:** `.env`의 `ALPAS_API_URL` (기본: `http://www.alpas.kr/BTLMS/HOMEPAGE/API`)

---

## 2. AE117.do (신착자료)

| 항목 | 내용 |
|------|------|
| **URL** | `GET /AE117.do` |
| **용도** | 배가일자(shelf_date) 기간으로 신착 도서 목록 조회 |
| **파라미터** | `networkadapterid`, `manage_code`, `shelf_date_from`, `shelf_date_to`, `current_page`, `count_per_page`, `api_key`(선택) |
| **응답** | `searchList[]`, `totalCount`, `totalPage` |

**우리 사용처**

- `getNewArrivals()` — DID 신착 도서 (`/did/new`)
- `getBookDetail(bookId)` 4단계 fallback — 신착 목록에서 bookId로 찾기

**응답 항목 → Book 매핑 (대문자 키)**

| ALPAS 필드 | 설명 | Book 필드 |
|------------|------|-----------|
| BOOK_KEY, REG_NO | 도서 키·등록번호 | id, registrationNumber |
| TITLE | 서명 | title |
| AUTHOR | 저자 | author |
| PUBLISHER | 발행자 | publisher |
| PUBLISH_YEAR | 발행년도 | publishedYear |
| EA_ISBN | ISBN | isbn |
| CALL_NO | 청구기호 | callNumber |
| SHELF_LOC_CODE_DESC | 자료실 설명 | shelfCode |
| USE_LIMIT_CODE_DESC | 이용제한 설명 | category |
| loan_able | 대출가능 여부 | isAvailable |

- 표지: AE117에는 없어 `coverImageUrl`은 picsum 플레이스홀더 사용.

---

## 3. AD201.do (도서 검색 / 목록)

### 3-1. GET (키워드 검색)

| 항목 | 내용 |
|------|------|
| **URL** | `GET /AD201.do` |
| **파라미터** | `networkadapterid`, `manage_code`, `keyword`, `api_key`(선택) |
| **응답** | `searchList[]` 또는 `result.list[]` (서버에 따라 다름) |

**우리 사용처**

- `searchBooks(keyword)` — DID 검색 (`/did/search`)
- `getBooksByAgeGroup(group)` — 연령별 도서 (`/did/age/:group`), 키워드: 그림책/동화, 과학/역사/모험, 청소년/소설
- `getBookDetail(bookId)` 1·5단계 — bookId로 검색, 연령별 목록에서 ID 매칭

**매핑:** 응답 형태(대문자/소문자)에 따라 `mapSearchItemToBook()`에서 여러 키 후보 지원 (bookTitle/title/TITLE, author/AUTHOR 등).

### 3-2. POST (libNo·검색어 기반 목록)

| 항목 | 내용 |
|------|------|
| **URL** | `POST /AD201.do` |
| **Body** | `_apikey`, `libNo`, `startPage`, `pageSize`, `searchWord`(선택), `searchType`(선택) |
| **응답** | `result.list[]`, `result.totalCount` |

**우리 사용처**

- `getBookDetail(bookId)` 2·3단계 — 목록 1~50건에서 bookId 매칭, 없으면 searchWord=bookId로 검색
- `getLibrarianPicks()` — 키워드(어린왕자, 이상한나라, 해리포터)별 1건씩

**응답 항목 (camelCase) → Book:** bookId/orgNo→id, bookTitle→title, author, publisher, publishYear, isbn, callNo, subject/kdc→shelfCode·category, bookImage→coverImageUrl, loanPossible→isAvailable.

---

## 4. AD206.do (도서 상세정보)

| 항목 | 내용 |
|------|------|
| **URL** | `GET /AD206.do` |
| **파라미터** | `book_key`(필수), `networkadapterid`, `manage_code`, `api_key`(선택) |
| **응답** | `status`, `statusDescription`, `statusCode`, `bookinfo`(2차 컨테이너) |
| **에러** | `status === 'WARNING'` 또는 `statusCode === 'HOMEPAGE_SERVICE_0142'` → 종키 미존재, null 처리 |

**우리 사용처**

- `getBookDetail(bookId)` **0단계(최우선)** — 책키 1건 상세 조회

**bookinfo → Book 매핑**

| ALPAS 필드 | 설명 | Book 필드 |
|------------|------|-----------|
| BOOK_KEY, REG_NO | 책키·등록번호 | id, registrationNumber |
| TITLE | 서명 | title |
| AUTHOR | 저자 | author |
| PUBLISHER | 발행자 | publisher |
| PUB_YEAR_INFO | 발행년도 | publishedYear |
| ISBN | ISBN | isbn |
| CALL_NO | 청구기호 | callNumber |
| SHELF_LOC_CODE_DESC | 자료실 설명 | shelfCode |
| USE_LIMIT_CODE_DESC | 이용제한 설명 | category |
| LOAN_ABLE | 대출가능 여부 | isAvailable |

- 표지: AD206 문서에 없어 `coverImageUrl`은 picsum 플레이스홀더 사용.

---

## 5. getBookDetail(bookId) 조회 순서

| 순서 | 방식 | 설명 |
|------|------|------|
| 0 | **AD206** | `book_key=bookId` 1건 상세 (우선) |
| 1 | AD201 GET | keyword=bookId 검색 후 id 일치 항목 반환 |
| 2 | AD201 POST | 목록 1~50건에서 bookId/orgNo 매칭 |
| 3 | AD201 POST | searchWord=bookId, searchType=1 로 검색 |
| 4 | AE117 | 신착 목록(getNewArrivalsInternal)에서 id 매칭 |
| 5 | AD201 GET | 연령별(elementary, preschool, teen) 목록에서 id 매칭 |

---

## 6. 공통 설정·환경 변수

| 변수 | 용도 |
|------|------|
| ALPAS_API_URL | API 베이스 URL |
| ALPAS_API_KEY | api_key / _apikey |
| ALPAS_LIB_NO | 도서관 번호 (AD201 POST) |
| ALPAS_MANAGE_CODE | 관리 코드 |
| ALPAS_NETWORK_ADAPTER_ID | 네트워크 어댑터 ID |

- `ALPAS_USE_MOCK=true`(또는 1)이면 Real 호출 없이 Mock(BK001~BK035) 사용.
- Real 사용: `ALPAS_USE_MOCK=false` + (`ALPAS_API_URL` 또는 `ALPAS_API_KEY` 설정).

---

## 7. DID API 노출

- **목록(신착/연령별/사서추천):** id, title, author, coverImageUrl, shelfCode, category
- **상세 GET /api/did/books/:bookId:** id, title, author, publisher, publishedYear, isbn, summary, shelfCode, callNumber, category, coverImageUrl, isAvailable
- **검색 GET /api/did/search?q=:** 목록 필드 + videoStatus, hasVideo

---

## 8. 참고 파일

- API 호출·매핑: `packages/backend/src/services/alpas-real.service.ts`
- Real/Mock 선택: `packages/backend/src/services/alpas.service.ts`
- Mock 데이터: `packages/backend/src/services/alpas.service.mock.ts`
- DID 라우트: `packages/backend/src/routes/did.routes.ts`, `did.controller.ts`
