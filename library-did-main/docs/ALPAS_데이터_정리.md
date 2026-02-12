# ALPAS에서 가져오는 정보 정리

영상 파이프라인은 잠시 두고, ALPAS API로 **어떤 API를 쓰고**, **어떤 필드를 받아서** 내부 `Book` 모델로 쓰는지만 정리한 문서입니다.

---

## 1. 사용하는 ALPAS API (2종)

| API | 용도 | 메서드 | 비고 |
|-----|------|--------|------|
| **AE117.do** | 특정 기간 **신착자료** 검색 | GET | 배가일자(shelf_date) 기간으로 조회 |
| **AD201.do** | **도서 검색** (키워드) / 목록 조회 | GET 또는 POST | 키워드 검색(GET), 또는 libNo 기반 목록(POST) |

실제 호출은 `packages/backend/src/services/alpas-real.service.ts`에서 이루어집니다.

---

## 2. AE117.do (신착자료)

- **호출 경로**: `GET /AE117.do`
- **용도**: `getNewArrivals()` — DID "신착 도서" 목록
- **파라미터**:
  - `networkadapterid`, `manage_code`, `api_key` (config에서)
  - `shelf_date_from`, `shelf_date_to`: `YYYY/MM/DD` (현재 코드: 최근 1개월)
  - `current_page`, `count_per_page`: 페이징 (기본 1, 10)

**응답 구조 (문서/코드 기준)**

- `searchList[]`: 도서 배열
- 각 항목 필드 (대문자 키):

| ALPAS 필드 | 설명 | 우리 Book 매핑 |
|------------|------|----------------|
| BOOK_KEY | 도서 키 | `id` (없으면 REG_NO) |
| REG_NO | 등록번호 | `registrationNumber` |
| TITLE | 제목 | `title` |
| VOL_TITLE | 권제목 | (미사용) |
| AUTHOR | 저자 | `author` |
| PUBLISHER | 출판사 | `publisher` |
| PUBLISH_YEAR | 발행년도 | `publishedYear` |
| EA_ISBN | ISBN | `isbn` |
| CALL_NO | 청구기호 | `callNumber` |
| SHELF_LOC_CODE_DESC | 서가 위치 설명 | `shelfCode` |
| USE_LIMIT_CODE_DESC | 이용제한(대상) 설명 | `category` |
| loan_able | 대출가능 여부 | `isAvailable` (Y/N) |

- AE117에는 **표지 이미지 URL** 필드가 코드상 없어서, 현재는 `coverImageUrl`을 picsum 플레이스홀더로 채움.

---

## 3. AD201.do (도서 검색 / 목록)

두 가지 방식으로 사용합니다.

### 3-1. GET (키워드 검색)

- **호출**: `GET /AD201.do`
- **파라미터**: `networkadapterid`, `manage_code`, `keyword`, `api_key`
- **용도**: `searchBooks(keyword)` — DID 검색
- **응답**: `searchList[]` 또는 `result.list[]` (API에 따라 다를 수 있음)

### 3-2. POST (libNo 기반 목록)

- **호출**: `POST /AD201.do`
- **Body**: `_apikey`, `libNo`, `startPage`, `pageSize`, `searchWord?`, `searchType?`
- **용도**:
  - `getBookDetail(bookId)`: 1~50건 조회 후 `bookId`/`orgNo` 매칭, 없으면 `searchWord=bookId`로 재검색
  - `getLibrarianPicks()`: 키워드별 1건씩 (어린왕자, 이상한나라, 해리포터)
  - `getBooksByAgeGroup()`: 연령별 키워드 검색

**응답 구조 (POST/result.list 기준)**

- `result.list[]`: 도서 배열
- 각 항목 필드 (camelCase):

| ALPAS 필드 | 설명 | 우리 Book 매핑 |
|------------|------|----------------|
| bookId / orgNo | 도서 ID | `id` |
| bookTitle | 제목 | `title` |
| author | 저자 | `author` |
| publisher | 출판사 | `publisher` |
| publishYear | 발행년도 | `publishedYear` |
| isbn | ISBN | `isbn` |
| callNo | 청구기호 | `callNumber` |
| subject / kdc | 주제/분류 | `shelfCode`, `category` |
| regDate | 등록일 | (미사용) |
| bookImage | 표지 이미지 URL | `coverImageUrl` (있으면 사용) |
| bookType | 자료유형 | (미사용) |
| loanCnt | 대출횟수 | (미사용) |
| loanPossible | 대출가능 여부 | `isAvailable` (Y/N) |

---

## 4. 내부 Book 모델 (우리가 쓰는 필드)

ALPAS 응답은 위와 같이 **두 가지 형태**(AE117 대문자 키 / AD201 camelCase)로 들어오고,  
`alpas-real.service.ts`에서 아래 한 가지 `Book` 타입으로 통일합니다.

```ts
// packages/backend/src/types/index.ts
interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  isbn: string;
  summary: string;
  callNumber: string;
  registrationNumber: string;
  shelfCode: string;
  isAvailable: boolean;
  coverImageUrl?: string;
  category: string;
}
```

- **summary**: ALPAS 원본에는 없음. 코드에서 `"${title} - ${author} 저. ${publisher}에서 출판한 도서입니다."` 형태로 생성.

---

## 5. DID API에서 노출하는 ALPAS 기반 정보

- **목록 (신착/사서추천/연령별)**: `id`, `title`, `author`, `coverImageUrl`, `shelfCode`, `category`
- **상세 (GET /api/did/books/:bookId)**: `id`, `title`, `author`, `publisher`, `publishedYear`, `isbn`, `summary`, `shelfCode`, `callNumber`, `category`, `coverImageUrl`, `isAvailable`
- **검색 (GET /api/did/search?q=)**: 위 목록 필드 + `videoStatus`, `hasVideo`
- **영상 요청 시**: `getBookDetail(bookId)`로 가져온 Book의 `id`, `title`, `author`, `summary`를 큐에 넣어 Worker로 전달

---

## 6. 환경 변수 (ALPAS 연동 시)

- `ALPAS_API_URL`: API 베이스 URL (기본값: `http://www.alpas.kr/BTLMS/HOMEPAGE/API`)
- `ALPAS_API_KEY`: api_key / _apikey
- `ALPAS_LIB_NO`: 도서관 번호 (AD201 POST)
- `ALPAS_MANAGE_CODE`: 관리 코드 (AE117, AD201)
- `ALPAS_NETWORK_ADAPTER_ID`: 네트워크 어댑터 ID

`ALPAS_API_URL` 또는 `ALPAS_API_KEY`가 설정되어 있으면 Real API, 없으면 Mock 도서 목록(BK001~BK035)을 사용합니다.

---

## 7. 참고 파일

- API 호출·매핑: `packages/backend/src/services/alpas-real.service.ts`
- 진입점(Real vs Mock): `packages/backend/src/services/alpas.service.ts`
- Mock 데이터: `packages/backend/src/services/alpas.service.mock.ts`
- DID API: `packages/backend/src/controllers/did.controller.ts`
- 문서: `docs/alpas-api.xlsx` (API 스펙 상세)

이 문서는 **ALPAS에서 어떤 정보를 가져오는지**만 정리한 것이며, 영상 파이프라인 로직은 다루지 않습니다.
