# 스마트 DID 로컬 설치 및 테스트 가이드 (Windows)

## 시스템 구조

```
[도서관 PC - 로컬]                         [GCP 클라우드]

  Backend (API 서버)  ---- 인터넷 ---->  Cloud SQL (smart-did DB)
  Frontend (웹 화면)  ---- 인터넷 ---->  Cloud Storage (영상 파일)
       |                                Cloud Run Worker (영상 생성)
       v                                Cloud Memorystore (Redis)
  ALPAS (도서관 내부망)
```

| 기능 | 위치 | 설명 |
|------|------|------|
| 도서 검색/신착도서 | 로컬 Backend | ALPAS 내부망 직접 접근 |
| 데이터베이스 | GCP Cloud SQL | 영상 상태, 추천도서 등 관리 |
| 영상 파일 저장 | GCP Cloud Storage | 생성된 영상 파일 저장/재생 |
| 영상 생성 | GCP Cloud Run Worker | Admin 페이지에서 요청 시 생성 |
| 영상 생성 큐 | GCP Cloud Memorystore | Redis (클라우드에서만 사용) |

- 로컬에는 Node.js만 설치 (Redis, PostgreSQL 설치 불필요)
- 영상 생성은 클라우드 Admin 페이지에서만 진행
- DID 키오스크는 이미 생성된 영상만 재생

## 시스템 요구사항

- **OS**: Windows 10 Pro 이상
- **CPU**: Intel i3 이상
- **RAM**: 8GB 이상
- **저장공간**: 2GB 이상 여유 공간
- **네트워크**: 인터넷 + 도서관 내부망 동시 접근 가능

---

## 테스트 및 설치 순서

### 0단계: 사전 준비 (원격)

도서관 방문 전 GCP Cloud SQL에 도서관 IP 허용이 필요합니다.

1. 도서관 PC에서 브라우저로 https://whatismyip.com 접속
2. 표시되는 공인 IP 주소 확인 (예: 211.xxx.xxx.xxx)
3. 개발팀에 IP 전달 또는 직접 GCP Console에서 추가

(상세 방법은 아래 "GCP Cloud SQL IP 허용 방법" 참고)

### 1단계: 프로젝트 복사

USB로 `lib-mvp` 폴더를 도서관 PC에 복사합니다.
(예: `C:\smart-did\lib-mvp`)

### 2단계: ALPAS 연동 테스트

`scripts\test-alpas.bat` **더블클릭**

이 스크립트가 확인하는 항목:
- ALPAS 서버 연결 가능 여부
- 신착도서(AE117) 조회
- 도서검색(AD201) 조회

결과:
- **성공** → 3단계로 진행
- **실패** → 아래 "ALPAS 연동 실패 시" 참고

### 3단계: 설치

`scripts\setup.bat` **더블클릭** (관리자 권한 필요)

설치 항목:
1. Node.js - JavaScript 런타임 (자동 다운로드)
2. 프로젝트 의존성 - npm 패키지
3. DB 연결 확인 - GCP Cloud SQL (smart-did)
4. 빌드 - 백엔드, 공유 패키지

설치 시간: 약 5-10분

설치 중 메모장이 열리면 ALPAS 설정을 확인하세요:
```
ALPAS_API_URL=http://10.10.11.13:28280/METIS/HOMEPAGE/API
ALPAS_API_KEY=1
ALPAS_LIB_NO=144045
ALPAS_MANAGE_CODE=CH
```

### 4단계: 실행

`scripts\start-all.bat` **더블클릭**

| 서비스 | 포트 | 역할 |
|--------|------|------|
| 백엔드 | 3001 | API 서버 (ALPAS 연동 + DB 조회) |
| 프론트엔드 | 5173 | 웹 화면 (DID 키오스크) |

실행 후 자동으로 브라우저가 열립니다.

※ "Redis 미설치 경고"가 나올 수 있으나 무시해도 됩니다.
   영상 생성 큐는 클라우드에서만 사용됩니다.

### 5단계: 동작 확인

| 확인 항목 | 방법 |
|----------|------|
| 신착도서 표시 | DID 메인 화면에서 신착도서 목록 확인 |
| 도서 검색 | 검색 기능으로 도서 검색 확인 |
| 영상 재생 | 이미 생성된 영상이 있는 도서 상세에서 재생 확인 |
| 관리자 페이지 | http://localhost:5173/admin 접속 확인 |

---

## ALPAS 연동 실패 시

ALPAS 내부망 접근이 불가능한 경우:

→ 별도 로컬 설치 없이 **GCP 클라우드 베타 버전**을 사용합니다.
→ 클라우드 URL로 접속하여 DID 키오스크 운영
→ 검색/신착 기능은 ALPAS Mock 데이터 또는 공개 테스트 서버 사용

---

## 영상 생성 (관리자 전용)

영상 생성은 DID 키오스크가 아닌 **클라우드 Admin 페이지에서만** 진행합니다.

1. 클라우드 Admin 페이지 접속 (Cloud Run 배포 URL)
2. 추천도서 등록 (제목/저자 입력)
3. 영상 자동 생성 (Worker가 처리)
4. 생성 완료 시 DID에서 자동으로 영상 재생 가능

---

## GCP Cloud SQL IP 허용 방법

### 방법 1: GCP Console (웹)

1. https://console.cloud.google.com 접속
2. 프로젝트: asanlibrary 선택
3. 좌측 메뉴 > SQL 클릭
4. 인스턴스 선택 (smart-did)
5. **연결** 탭 클릭
6. **승인된 네트워크** 섹션에서 **네트워크 추가** 클릭
7. 이름: `library` / 네트워크: `도서관공인IP/32` (예: `211.xxx.xxx.xxx/32`)
8. **저장** 클릭 (적용까지 1-2분 소요)

### 방법 2: gcloud CLI

```bash
# 현재 허용된 네트워크 확인
gcloud sql instances describe smart-did \
  --project=asanlibrary \
  --format="value(settings.ipConfiguration.authorizedNetworks)"

# 도서관 IP 추가
gcloud sql instances patch smart-did \
  --project=asanlibrary \
  --authorized-networks=기존IP/32,도서관IP/32
```

※ 테스트 시 임시로 `0.0.0.0/0` (전체 허용) 후, 확인되면 도서관 IP만 남기고 제거

---

## 키오스크 자동 시작 설정 (선택)

PC 부팅 시 자동으로 서버와 브라우저를 시작하려면:

### 서버 자동 시작
1. `Win + R` → `shell:startup` 입력
2. 시작 프로그램 폴더가 열림
3. `start-all.bat` 파일의 **바로가기**를 이 폴더에 복사

### 브라우저 전체화면 자동 시작
1. Chrome 바로가기 만들기
2. 바로가기 속성 → 대상 끝에 추가:
   ```
   --kiosk http://localhost:5173
   ```
3. 이 바로가기도 시작 프로그램 폴더에 복사

---

## 문제 해결

### ALPAS API 연결 실패
1. 도서관 내부망에 연결되어 있는지 확인
2. `ping 10.10.11.13` 으로 네트워크 확인
3. `.env`의 `ALPAS_API_URL` 주소 확인

### DB 연결 실패 ("Can't reach database server")
1. 인터넷 연결 확인
2. GCP Cloud SQL에 도서관 IP가 허용되어 있는지 확인
3. 위 "GCP Cloud SQL IP 허용 방법" 참고

### 서버가 시작되지 않음
1. 포트 3001, 5173이 사용 중인지 확인
2. 방화벽에서 해당 포트 허용
3. `setup.bat`을 먼저 실행했는지 확인

---

## 관리자 접속

- URL: http://localhost:5173/admin
- 계정: `admin` / `@admin1234@`

---

## 서비스 종료

각 검은 창(터미널)을 닫으면 해당 서비스가 종료됩니다.
모든 창을 닫으면 전체 서비스가 종료됩니다.
