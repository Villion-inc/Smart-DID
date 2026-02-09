# Smart DID — 앞으로 할 작업

**참고 문서:** `개발_기록.md`, `아산도서관_개발_Final.md`, `진행_체크리스트.md`  
**기준:** Final 4절(미구현 항목), 개발_기록 "앞으로 할 것", 체크리스트 미완료 항목

---

## 우선순위 요약

| 구분 | 항목 수 | 설명 |
|------|--------|------|
| **Critical (MVP 차단)** | 3 | 반드시 해결해야 실제 영상 생성·프로덕션 준비 가능 |
| **Important (기능 완성)** | 4 | 서비스 완성도·운영에 필요 |
| **선택 (프로덕션·품질)** | 5+ | 여유 있을 때 진행 |

---

## 1. Critical — MVP 차단 (반드시 해결)

### 1.1 Worker 진입점을 Pipeline V2로 전환 ⭐ 최우선

| 참고 | 내용 |
|------|------|
| **개발_기록** | worker.ts에서 `videoGeneratorService.generateVideo()` 제거, `PipelineOrchestratorV2.execute()` + `GeminiProviderAdapter` 사용 |
| **Final 3.3 A** | Job 데이터 → VideoGenerationRequest 변환 후 파이프라인 실행, 결과를 기존 Backend 콜백으로 전달 |
| **체크리스트** | `videoGeneratorService.generateVideo()` 제거, `PipelineOrchestratorV2.run()` 호출로 교체 (GeminiProvider 구현됨) |

**할 일:**
- `packages/worker/src/worker.ts`에서 `videoGeneratorService` 대신 `PipelineOrchestratorV2` + `GeminiProviderAdapter` 호출.
- Job 데이터(`VideoJobData`) → `VideoGenerationRequest`(또는 파이프라인 입력 타입) 매핑.
- 성공 시 videoUrl/subtitleUrl, 실패 시 errorMessage로 기존 `notifyBackendVideoCallback` 그대로 사용.

**예상:** 1~2일 (이미 pipeline·gemini-provider·콜백 준비됨)

---

### 1.2 FFmpeg 영상 병합 실제 연동

| 참고 | 내용 |
|------|------|
| **개발_기록** | video-processor 코드 준비됨. fluent-ffmpeg 설치 및 실제 영상 병합/자막 삽입 동작 검증 |
| **Final 4.1** | fluent-ffmpeg 연동, 1~2일 |
| **현재** | `mergeScenes()`는 Mock 버퍼만 저장. `video-processor.ts`는 복사됐으나 Worker 진입 경로에서 실제 호출 전 |

**할 일:**
- `packages/worker`에 `fluent-ffmpeg` 설치 확인 (이미 package.json에 있을 수 있음).
- `video-generator.service.ts`의 `mergeScenes()` 또는 Pipeline V2 경로에서 `video-processor`의 실제 병합·자막 삽입 호출.
- 로컬에서 단일/다중 장면 → 1개 영상 파일 생성 E2E 검증.

**예상:** 1~2일

---

### 1.3 프로덕션 DB (PostgreSQL + Prisma 전환)

| 참고 | 내용 |
|------|------|
| **개발_기록** | Prisma 스키마 이미 있음. PostgreSQL 전환 시 DATABASE_URL 변경, 마이그레이션 실행. subtitleUrl 마이그레이션 적용 확인 |
| **Final 4.1** | 인메모리 Map → PostgreSQL + Prisma, 2~3일 |
| **체크리스트** | Repository 전환 (Map → Prisma). DB 영속 확인 |

**할 일:**
- `DATABASE_URL`을 PostgreSQL 연결 문자열로 변경.
- `packages/backend`에서 `npx prisma migrate deploy`(또는 dev) 실행, `subtitleUrl` 등 마이그레이션 적용 확인.
- Backend가 인메모리가 아닌 Prisma 리포지토리만 사용하도록 확인 (이미 Prisma 사용 중이면 전환 완료 상태 점검).

**예상:** 1~2일 (스키마·리포지토리 이미 있으면 단축)

---

## 2. Important — 기능 완성

### 2.1 S3 스토리지 실제 구현

| 참고 | 내용 |
|------|------|
| **개발_기록** | S3StorageProvider 스텁을 AWS SDK 연동으로 교체. presigned URL 생성 |
| **Final 4.2** | storage.service.ts S3 업로드 + presigned URL, 1~2일 |

**할 일:**
- `packages/worker/src/services/storage-s3.provider.ts`에 AWS SDK 연동, 업로드·다운로드·getUrl(presigned) 구현.
- `STORAGE_TYPE=s3`일 때 `getStorageProvider()`가 S3 인스턴스 반환하도록 확인.
- 환경변수: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION` 등.

**예상:** 1~2일

---

### 2.2 ALPAS 실제 API

| 참고 | 내용 |
|------|------|
| **개발_기록** | AD201(검색), AD206(상세), AE117(신착) 스켈레톤 완성 |
| **Final 4.2** | alpas-real.service.ts 스켈레톤 완성, 1일 |

**할 일:**
- `packages/backend/src/services/alpas-real.service.ts`에서 AD201, AD206, AE117 실제 호출 구현.
- Backend가 Mock 대신 alpas-real을 쓰도록 설정/환경에 따라 전환 가능하게 (또는 배포 시에만 real 사용).

**예상:** 1일

---

### 2.3 Prisma 마이그레이션·리포지토리 전환

| 참고 | 내용 |
|------|------|
| **진행_체크리스트** | prisma/schema.prisma 정의됨. 마이그레이션 실행 + 리포지토리 전환, 1일 |

**할 일:**
- 프로덕션 DB 항목과 겹침. PostgreSQL 전환 후 마이그레이션 적용·리포지토리가 Prisma만 사용하는지 최종 확인.

---

### 2.4 WebSocket 실시간 알림

| 참고 | 내용 |
|------|------|
| **Final 4.2** | 영상 생성 진행률을 DID 키오스크에 실시간 전달, 1일 |

**할 일:**
- Backend에 WebSocket(또는 SSE) 엔드포인트 추가.
- Worker에서 단계별 진행률 이벤트 발행 → Backend가 클라이언트에 전달.
- Frontend(DID 페이지)에서 구독·진행률 표시.

**예상:** 1일

---

## 3. 선택 — 정리·품질·프로덕션

### 3.1 타입 통합 정리

| 참고 | 내용 |
|------|------|
| **개발_기록** | shared 타입과 worker/shared 재export 정리. 필요 시 네임스페이스 분리 |
| **체크리스트 3.3 C** | VideoGenerationRequest, SceneResult, QCReport 등 trailer-engine 핵심 타입을 shared로 이전, lib-mvp 타입과 충돌 방지 |

**할 일:**
- `packages/shared/src/types/`에 파이프라인·QC 타입 일원화.
- worker의 `shared/types` 재export 정리, import 경로 통일.

---

### 3.2 Config DI (선택)

| 참고 | 내용 |
|------|------|
| **개발_기록** | 싱글톤 → DI 패턴으로 테스트 용이화 |
| **Final 2.2** | config를 DI로 변경 |

**할 일:** Config·서비스를 생성자/함수 인자로 주입해 단위 테스트에서 Mock 교체 용이하게.

---

### 3.3 Nice-to-have (4.3절)

- BullMQ Dashboard (모니터링 UI)
- Prometheus + Grafana 메트릭
- E2E 테스트 (Frontend ↔ Backend ↔ Worker)
- 비용 최적화 자동화 (모델 자동 선택)
- DID 키오스크 터치 최적화

---

## 4. 권장 진행 순서 (의존성 반영)

1. **Worker Pipeline V2 전환** (1.1) — 실제 AI 파이프라인으로 한 번에 영상 생성 가능하게.
2. **FFmpeg 실제 연동** (1.2) — 장면 병합·자막 삽입이 실제 파일로 나오게.
3. **프로덕션 DB** (1.3) — 배포 시 데이터 영속.
4. **S3** (2.1) — 프로덕션에서 영상 파일 저장·URL 제공.
5. **ALPAS 실제 API** (2.2) — 실제 도서 데이터.
6. **WebSocket** (2.4) — UX 개선.
7. **타입 정리** (3.1) — 유지보수성.
8. **나머지 선택 항목** — 여유 있을 때.

---

## 5. 참고 — 이미 완료된 것 (체크리스트 기준)

- Worker 완료/실패 시 Backend 콜백 (POST /api/internal/video-callback)
- trailer-engine 파일 복사 (pipeline, qc, retry, services, config)
- Storage 추상화 (Local + S3 스텁), Config 통합, .env.example 보강
- 콘텐츠 안전 검증 (QC safetyKeywords 기반 isTextSafeForChildren)
- GeminiProviderAdapter 구현 (키프레임·비디오 연동)
- 테스트 기동 오류 수정 (Prisma 5, shared 빌드, Fastify/jwt 호환)

---

*작성: 개발_기록.md, 아산도서관_개발_Final.md, 진행_체크리스트.md 기준으로 정리.*
