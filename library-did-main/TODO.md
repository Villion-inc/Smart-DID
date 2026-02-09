# 구현 필요 항목 체크리스트

> 꿈샘 도서관 Smart DID Video Service
> 생성일: 2026-01-27

## 📊 프로젝트 현재 상태

### ✅ 구현 완료
- [x] 모노레포 프로젝트 구조 (npm workspaces)
- [x] Backend API (Express + TypeScript)
- [x] Frontend SPA (React + Vite)
- [x] Worker (BullMQ + Redis)
- [x] JWT 인증 시스템
- [x] In-memory 데이터베이스
- [x] 기본 CRUD API (Book, Video, Auth)
- [x] Admin 대시보드 기본 구현
- [x] Mock 데이터 및 시드
- [x] 기본 단위 테스트
- [x] Docker 설정 (Dockerfile, docker-compose)
- [x] 프로젝트 문서화 (8개 문서)
- [x] ESLint, Prettier 설정
- [x] TypeScript 타입 정의

---

## 🔴 **필수 구현 항목 (Priority: HIGH)**

### 1. Veo3.1 API 실제 통합
**현재 상태:** Mock 구현
**파일:** `packages/worker/src/services/veo.service.ts`
**작업 내용:**
- [ ] Veo3.1 API 엔드포인트 및 인증 설정
- [ ] 실제 비디오 생성 API 호출 구현 (L30, L75)
- [ ] API 키 검증 로직 구현 (L89)
- [ ] 에러 핸들링 및 재시도 로직
- [ ] API 응답 파싱 및 비디오 URL 처리
- [ ] 비동기 작업 상태 체크 (polling or webhook)

```typescript
// TODO 위치: packages/worker/src/services/veo.service.ts:30
// TODO: Replace with actual Veo3.1 API call
```

**예상 작업 시간:** 2-3일
**의존성:** Veo3.1 API 문서, API 키 발급

---

### 2. 비디오 씬 병합 구현 (ffmpeg)
**현재 상태:** Mock 구현
**파일:** `packages/worker/src/services/video-generator.service.ts:109`
**작업 내용:**
- [ ] ffmpeg 설치 및 설정
- [ ] 3개 씬(각 8초) 병합 로직 구현
- [ ] 비디오 인코딩 설정 (해상도, 비트레이트)
- [ ] 자막 임베딩 또는 별도 파일 생성
- [ ] 임시 파일 정리
- [ ] 에러 핸들링 (손상된 비디오 등)

```typescript
// TODO 위치: packages/worker/src/services/video-generator.service.ts:109
// TODO: Implement actual video merging using ffmpeg or similar
```

**기술 스택 제안:**
- `fluent-ffmpeg` (Node.js wrapper)
- `@ffmpeg-installer/ffmpeg` (자동 설치)

**예상 작업 시간:** 2-3일

---

### 3. 컨텐츠 안전성 검증 구현
**현재 상태:** 항상 `true` 반환
**파일:** `packages/worker/src/services/video-generator.service.ts:98`
**작업 내용:**
- [ ] 비디오 컨텐츠 분석 API 통합 (Google Video Intelligence, AWS Rekognition 등)
- [ ] 부적절한 컨텐츠 감지 (폭력, 공포, 성인 컨텐츠)
- [ ] 텍스트 프롬프트 사전 필터링 강화
- [ ] 검증 실패 시 재생성 또는 알림 로직
- [ ] 검증 로그 및 모니터링

```typescript
// TODO 위치: packages/worker/src/services/video-generator.service.ts:98
// TODO: Implement actual safety validation
```

**예상 작업 시간:** 1-2일

---

### 4. 데이터베이스 마이그레이션 (In-memory → Production DB)
**현재 상태:** In-memory Map 사용
**파일:** `packages/backend/src/db/index.ts`
**작업 내용:**
- [ ] DB 선택 (PostgreSQL 권장 or MongoDB)
- [ ] Prisma ORM 설정 (또는 TypeORM)
- [ ] 스키마 정의 및 마이그레이션 파일 생성
- [ ] 기존 In-memory DB 로직을 실제 DB로 교체
- [ ] 인덱스 설정 (성능 최적화)
- [ ] Connection pool 설정
- [ ] 환경별 DB 설정 (dev, staging, prod)

**스키마 참고:** `docs/ERD.md`

**예상 작업 시간:** 3-4일
**의존성:** DB 서버 설정

---

### 5. 클라우드 스토리지 연동 (S3)
**현재 상태:** 로컬 파일 시스템
**파일:** `packages/worker/src/services/storage.service.ts`
**작업 내용:**
- [ ] AWS S3 (또는 GCS, Azure Blob) 설정
- [ ] S3 SDK 통합 (`@aws-sdk/client-s3`)
- [ ] 비디오 파일 업로드 로직
- [ ] 자막 파일 업로드 로직
- [ ] 공개 URL 또는 Presigned URL 생성
- [ ] CDN 연동 (CloudFront 등)
- [ ] 파일 만료/삭제 정책 설정
- [ ] 환경별 버킷 분리 (dev, prod)

**예상 작업 시간:** 2-3일
**의존성:** AWS 계정, IAM 권한 설정

---

## 🟡 **중요 구현 항목 (Priority: MEDIUM)**

### 6. ALPAS 시스템 완전 통합
**현재 상태:** 일부 구현됨, Mock 데이터 혼용
**파일:** `packages/backend/src/services/alpas-real.service.ts`
**작업 내용:**
- [ ] ALPAS API 전체 엔드포인트 매핑
  - [x] AD201: 도서 검색
  - [x] AD206: 도서 상세
  - [x] AE117: 신간 도서
  - [ ] 추가 필요 엔드포인트 확인
- [ ] ALPAS 응답 에러 핸들링
- [ ] 실시간 도서 정보 동기화
- [ ] 대출 가능 여부 실시간 확인
- [ ] ALPAS API Rate limiting 대응
- [ ] Mock과 Real 서비스 전환 스위치 구현

**예상 작업 시간:** 3-4일
**의존성:** ALPAS API 문서, API 키

---

### 7. 비디오 생성 모니터링 대시보드
**현재 상태:** 미구현
**작업 내용:**
- [ ] Admin 대시보드에 비디오 생성 통계 추가
  - [ ] 전체 생성 수, 성공률, 실패율
  - [ ] 큐 상태 (대기 중, 진행 중)
  - [ ] 평균 생성 시간
- [ ] BullMQ UI 통합 (`@bull-board/express`)
- [ ] 실시간 작업 진행률 표시
- [ ] 실패한 작업 재시도 UI
- [ ] 작업 로그 뷰어

**예상 작업 시간:** 2-3일

---

### 8. 웹 알림 시스템
**현재 상태:** 미구현
**작업 내용:**
- [ ] WebSocket 또는 Server-Sent Events (SSE) 설정
- [ ] 비디오 생성 완료 시 실시간 알림
- [ ] Admin에게 실패 알림
- [ ] 브라우저 Push 알림 (선택사항)
- [ ] 알림 센터 UI 구현

**예상 작업 시간:** 2-3일

---

### 9. 통합 테스트 확장
**현재 상태:** 기본 단위 테스트만 존재
**파일:** `packages/*/src/__tests__/`
**작업 내용:**
- [ ] E2E 테스트 설정 (Playwright or Cypress)
- [ ] API 통합 테스트 (Supertest)
- [ ] Worker 통합 테스트
- [ ] 비디오 생성 플로우 전체 테스트
- [ ] 에러 시나리오 테스트
- [ ] 부하 테스트 (Artillery, k6)
- [ ] CI/CD 파이프라인 통합

**예상 작업 시간:** 3-5일

---

### 10. 성능 최적화
**작업 내용:**
- [ ] API 응답 캐싱 (Redis)
- [ ] 도서 검색 인덱싱
- [ ] 이미지 최적화 (WebP, lazy loading)
- [ ] 비디오 스트리밍 최적화 (HLS or DASH)
- [ ] DB 쿼리 최적화
- [ ] 번들 사이즈 최적화 (코드 스플리팅)
- [ ] CDN 활용

**예상 작업 시간:** 2-3일

---

## 🟢 **부가 기능 (Priority: LOW)**

### 11. 사용자 즐겨찾기 기능
**작업 내용:**
- [ ] 사용자 모델 확장 (즐겨찾기 리스트)
- [ ] 즐겨찾기 추가/제거 API
- [ ] 즐겨찾기 페이지 UI
- [ ] 로컬 스토리지 또는 DB 저장

**예상 작업 시간:** 1-2일

---

### 12. 사용 패턴 분석 및 트래킹
**작업 내용:**
- [ ] Google Analytics 또는 Mixpanel 통합
- [ ] 이벤트 트래킹 (검색, 비디오 재생, 도서 상세 조회)
- [ ] 사용자 행동 분석 대시보드
- [ ] A/B 테스트 프레임워크

**예상 작업 시간:** 2-3일

---

### 13. 자동 비디오 만료 정리 (Cron Job)
**작업 내용:**
- [ ] Cron 스케줄러 설정 (`node-cron` or BullMQ repeat)
- [ ] 만료된 비디오 자동 삭제
- [ ] S3 파일 정리
- [ ] DB 레코드 정리 또는 아카이빙
- [ ] 정리 로그 및 알림

**예상 작업 시간:** 1일

---

### 14. 다국어 지원 (i18n)
**작업 내용:**
- [ ] react-i18next 설정
- [ ] 한국어/영어 번역 파일 작성
- [ ] 언어 전환 UI
- [ ] 비디오 자막 다국어 지원

**예상 작업 시간:** 2-3일

---

### 15. DID 전용 기능 강화
**현재 상태:** 기본 페이지만 존재 (`packages/frontend/src/pages/did/`)
**작업 내용:**
- [ ] 터치스크린 최적화 UI
- [ ] 키오스크 모드 (자동 새로고침, 화면 보호)
- [ ] QR 코드 생성 (도서 상세 페이지 공유)
- [ ] 대기 화면 슬라이드쇼
- [ ] 음성 안내 (Text-to-Speech)

**예상 작업 시간:** 3-4일

---

## 🛠️ **기술 부채 및 개선 사항**

### 코드 품질
- [ ] ESLint 규칙 강화 및 전체 코드 린트
- [ ] 타입 안정성 개선 (strict mode 활성화)
- [ ] 중복 코드 리팩토링
- [ ] 에러 핸들링 표준화
- [ ] 로깅 레벨 및 포맷 통일

### 보안
- [ ] 환경 변수 암호화 (secrets manager)
- [ ] API Rate limiting 구현
- [ ] CORS 정책 정교화
- [ ] SQL Injection 방지 (Prepared statements)
- [ ] XSS 방지 (입력 sanitization)
- [ ] HTTPS 강제
- [ ] 보안 헤더 추가 (Helmet.js)

### 문서화
- [ ] API 문서 자동 생성 (Swagger/OpenAPI)
- [ ] 주석 및 JSDoc 추가
- [ ] 온보딩 가이드 작성
- [ ] 아키텍처 다이어그램 업데이트

---

## 📋 **주간 로드맵 (제안)**

### Week 1-2: 핵심 인프라
- [x] 프로젝트 셋업 완료
- [ ] 데이터베이스 마이그레이션 (항목 4)
- [ ] 클라우드 스토리지 연동 (항목 5)
- [ ] ALPAS 통합 완성 (항목 6)

### Week 3-4: 비디오 생성 파이프라인
- [ ] Veo3.1 API 통합 (항목 1)
- [ ] 비디오 병합 구현 (항목 2)
- [ ] 안전성 검증 구현 (항목 3)
- [ ] Worker 테스트 및 최적화

### Week 5-6: 사용자 경험 및 모니터링
- [ ] 모니터링 대시보드 (항목 7)
- [ ] 웹 알림 시스템 (항목 8)
- [ ] 통합 테스트 (항목 9)
- [ ] 성능 최적화 (항목 10)

### Week 7-8: 프로덕션 준비
- [ ] 보안 강화
- [ ] 부하 테스트
- [ ] 문서화 완성
- [ ] 베타 배포 및 피드백

---

## 🔍 **코드 내 TODO 위치**

```bash
# TODO 검색 명령어
grep -r "TODO" packages/*/src --include="*.ts" --include="*.tsx"
```

### 발견된 TODO 목록
1. `packages/worker/src/services/veo.service.ts:30` - Veo3.1 API 호출
2. `packages/worker/src/services/veo.service.ts:75` - 상태 체크 API
3. `packages/worker/src/services/veo.service.ts:89` - API 키 검증
4. `packages/worker/src/services/video-generator.service.ts:98` - 안전성 검증
5. `packages/worker/src/services/video-generator.service.ts:109` - 비디오 병합
6. `packages/frontend/src/pages/did/DidHome.tsx:224` - 연락처 정보 (031-XXX-XXXX)

---

## 📞 **연락처 및 기타**

### 미해결 정보
- [ ] 실제 도서관 연락처 (031-XXX-XXXX 수정 필요)
- [ ] 프로덕션 서버 정보
- [ ] 도메인 네임
- [ ] SSL 인증서

### 외부 의존성
- [ ] Veo3.1 API 액세스 권한
- [ ] ALPAS API 프로덕션 키
- [ ] AWS/GCP 계정
- [ ] 도메인 등록
- [ ] SSL 인증서

---

## 📊 **현재 프로젝트 통계**

- **총 TypeScript 파일**: ~60개
- **코드 라인 수**: ~5,000 줄
- **패키지**: 4개 (shared, backend, frontend, worker)
- **API 엔드포인트**: 10+개
- **테스트 케이스**: 15+개
- **문서 파일**: 8개

---

## ✅ **체크리스트 요약**

### 필수 (5개)
- [ ] Veo3.1 API 통합
- [ ] 비디오 병합 (ffmpeg)
- [ ] 안전성 검증
- [ ] DB 마이그레이션
- [ ] 클라우드 스토리지

### 중요 (5개)
- [ ] ALPAS 완전 통합
- [ ] 모니터링 대시보드
- [ ] 웹 알림
- [ ] 통합 테스트
- [ ] 성능 최적화

### 부가 (5개)
- [ ] 사용자 즐겨찾기
- [ ] 사용 패턴 분석
- [ ] 자동 만료 정리
- [ ] 다국어 지원
- [ ] DID 기능 강화

**전체 진행률: 30% (기본 인프라 완료)**

---

**작성일**: 2026-01-27
**최종 수정**: 2026-01-27
**다음 리뷰 예정**: 매주 월요일
