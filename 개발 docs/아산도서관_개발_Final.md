# 꿈샘 도서관 Smart DID Video Service 

## 개발팀 인수인계 문서

## trailer-engine → lib-mvp 통합 가이드

작성일: 2026-02-08 | 작성자: 이종원 | 버전: 1.0
목표: 1-2주 내 MVP 완성

## 1. 프로젝트 현황 요약

꿈샘 도서관 Smart DID Video Service는 아산 꿈샘 어린이청소년도서관의 DID 키오스크에서 AI 생성 도서 소개 영상(24초)을 재생하는 서비스입니다. 두 개의 코드 프로젝트로 구성됩니다.

## 1.1 프로젝트 구조

trailer-engine (완성도 ~ $\mathbf{8 0}$ \%): 이종원이 직접 개발한 AI 영상 생성 엔진. Gemini 2.0 Flash + Sora 2/Veo 3.1 기반. QC 시스템, 계층적 재시도, 멀티모델 추상화 완성. lib-mvp의 Worker에 통합되어야 합니다.
lib-mvp (완성도 $\mathbf{3 5 \%}$ 실질): 프론트엔드(85\%), 백엔드 $\mathrm{API}(70 \%)$, 공유 타입 $(90 \%)$ 은 잘 갖춰져 있으나, Worker의 핵심 로직(영상 생성, FFmpeg, DB)이 전부 Mock 상태입니다.

## 1.2 컴포넌트별 완성도

| 컴포넌트 | 완성도 | 상태 | 핵심 이슈 |
| :--- | :--- | :--- | :--- |
| Frontend (React) | 85\% | DONE | Backend 연결 후 E2E 테스트 필요 |
| Shared Types | 90\% | DONE | trailer-engine 타입 통합 필요 |
| Backend API | 70\% | PARTIAL | DB가 인메모리, ALPAS 부분 Mock |
| Worker (영상 생성) | 15\% | MOCK | Veo/Sora 미연동, FFmpeg 미구현 |
| trailer-engine | 80\% | DONE | lib-mvp Worker로 통합 필요 |
| Docker/배포 | 60\% | PARTIAL | 시크릿 관리, 모니터링 미구현 |

## 2. trailer-engine 아키텍처 (인수 대상)

trailer-engine은 독립 실행 가능한 Express 서버(POST /video-engine)로, V2 파이프라인이 프로덕션 권장 버전입니다.

### 2.1 V2 파이프라인 흐름

1. Book Grounding: 도서 존재 확인 및 팩트 추출 (Gemini 2.0 Flash)
2. Style Bible 생성: 시각적 일관성 가이드 (색상 팔레트, 캐릭터 스타일, 분위기)
3. Scene Planning: 3장면 구조 설계 (intro → body → outro, 각 8초)
4. Script 생성: 장면별 나레이션 + 비주얼 프롬프트 + 키프레임/비디오 프롬프트
5. Keyframe 이미지 생성: Imagen 4.0 기반 (시드 제어로 일관성 확보)
6. Video 생성: Sora 2 (기본) 또는 Veo 3.1 (대안). 계층적 재시도 적용
7. QC Pipeline: Safety Gate → Typography → Consistency → Video Scoring
8. 자막 생성: WebVTT 포맷, 장면 기반 타이밍
9. 비용 리포팅: API 호출 횟수, 재시도 배수, 소요 시간

## 2.2 핵심 서비스 파일 목록

| 파일 경로 | 역할 | LOC | 재사용 가능 |
| :--- | :--- | :--- | :--- |
| src/pipeline/orchestrator.ts | 메인 파이프라인 $(\mathrm{V} 1+\mathrm{V} 2)$ | 586 | 그대로 사용 |
| src/services/gemini-client-v2.ts | Gemini 2.0 Flash 클라이언트 | 368 | 그대로 사용 |
| src/services/sora-client.ts | OpenAI Sora 2 클라이언트 | 399 | 그대로 사용 |
| src/services/veo31-client.ts | Google Veo 3.1 클라이언트 | 228 | 그대로 사용 |
| src/services/comet-sora-client.ts | Comet 3rd-party Sora API | 351 | 그대로 사용 |
| src/services/video-processor.ts | FFmpeg 영상 병합/자막 | 159 | 그대로 사용 |
| src/services/subtitle-generator.ts | WebVTT/SRT 자막 생성 | 117 | 그대로 사용 |
| src/qc/qcRunner.ts | QC 파이프라인 오케스트레이터 | 176 | 그대로 사용 |
| src/qc/safetyGate.ts | 안전성 검증 (금지어 필터) | 117 | 그대로 사용 |
| src/qc/checkTypography.ts | 자막 타이포그래피 검증 | 164 | 그대로 사용 |
| src/qc/checkConsistency.ts | 장면 간 일관성 검증 | 220 | 그대로 사용 |
| src/qc/scoreVideo.ts | 종합 QC 점수 산출 | 161 | 그대로 사용 |
| src/worker/hierarchicalRetry.ts | 계층적 재시도 시스템 | 432 | 그대로 사용 |
| src/worker/retryPolicy.ts | 장면 재시도 정책 | 186 | 그대로 사용 |
| src/worker/sceneGenerator.ts | 병렬/순차 장면 생성 | 247 | 그대로 사용 |
| src/shared/types/index.ts | 전체 타입 정의 | 459 | lib-mvp types와 병합 |
| src/config/index.ts | 설정 관리 | 54 | DI 패턴으로 변경 |
| src/server.ts | Express 서버 진입점 | 97 | 제거 (lib-mvp에 통합) |

### 2.3 QC 시스템 상세

QC는 4단계 순차 파이프라인으로, Safety Gate에서 실패하면 즉시 중단됩니다.
Safety Gate (가중치 40\%): 금지어 68개(한/영) 필터링, 긍정 단어 최소 1개 필수, Disney/Pixar 등 13개 브랜드명 자동 차단. 아동 콘텐츠 zero-tolerance. 점수 $=1.0$ 필수.

Typography (가중치 20\%): 자막 줄 길이 검증, Safe Area(하단 10\% 마진), 최소 폰트 크기(아동 가독성), WCAG AA 대비율 4.5:1. 자동 수정 기능 포함.

Consistency (가중치 30\%): Anchor Match 0.75+, 장면 간 일관성 0.80+, 색상 팔레트 드리프트 최대 0.20. 키워드 추출 + Jaccard 유사도 기반.

Technical/Scoring (가중치 10\%): 종합 점수 $=\operatorname{Typography}(20 \%)+\operatorname{Consistency}(30 \%)+\operatorname{Safety}(40 \%)+$ Technical(10\%). 통과 기준: 85점 이상.

## 2.4 계층적 재시도 시스템

비용 최적화를 위해 실패 단계만 재시도합니다. Script(3회) → Keyframe(3회) $\rightarrow \operatorname{Video}$ (2회). 성공한 이전 단계는 재사용. 재시도 1회당 ~\$0.56 절감. 병렬 생성 시도 후 Rate Limit 감지시 자동으로 순차 생성(2초 딜레이)으로 전환.

## 3. 통합 계획: trailer-engine → lib-mvp Worker

trailer-engine의 코드를 lib-mvp/packages/worker/ 에 통합하는 구체적인 방법입니다.

## 3.1 통합 아키텍처

현재 lib-mvp Worker의 veo.service.ts(Mock)와 video-generator.service.ts(Mock)를 trailer-engine의 PipelineOrchestratorV2로 교체합니다.

## 현재 (Mock) 데이터 흐름:

BullMQ Job → videoGeneratorService.generateVideo() → veoService.generateScene() [MOCK] → mergeScenes() [MOCK] → 가짜 URL 반환

## 통합 후 데이터 흐름:

BullMQ Job → PipelineOrchestratorV2.run(bookTitle) → Gemini Script → Sora/Veo Video → QC Pipeline → FFmpeg 병합 → S3 업로드 → 실제 URL 반환

## 3.2 파일 이동 계획

| trailer-engine 소스 | lib-mvp 대상 | 작업 |
| :--- | :--- | :--- |
| src/pipeline/ | packages/worker/src/pipeline/ | 폴더 복사 |
| src/services/gemini-* | packages/worker/src/services/ | 복사 + import 수정 |
| src/services/sora-client.ts | packages/worker/src/services/ | 복사 |
| src/services/veo31-client.ts | packages/worker/src/services/ | 기존 veo.service.ts 교체 |
| src/services/video-processor.ts | packages/worker/src/services/ | 기존 mergeScenes() 교체 |
| src/services/subtitle-generator.ts | packages/worker/src/services/ | 복사 |
| src/qc/* | packages/worker/src/qc/ | 폴더 복사 |
| src/worker/hierarchicalRetry.ts | packages/worker/src/retry/ | 복사 |
| src/worker/sceneGenerator.ts | packages/worker/src/retry/ | 복사 |
| src/shared/types/index.ts | packages/shared/src/types/ | 기존 타입과 병합 |
| src/config/index.ts | packages/worker/src/config/ | 기존 config와 병합 |

## 3.3 핵심 수정 사항

## A. Worker 진입점 수정 (packages/worker/src/worker.ts)

기존 videoGeneratorService.generateVideo()를 PipelineOrchestratorV2.run()으로 교체합니다. Job 데이터에서 bookTitle을 추출하여 파이프라인에 전달하고, 결과물(videoUrl, subtitleUrl)을 Backend API에 콜백합니다.

## B. Config 통합 (packages/worker/src/config/)

trailer-engine의 config(GEMINI_API_KEY, OPENAI_API_KEY)를 lib-mvp Worker의 기존 config에 병합합니다. 싱글톤 패턴에서 DI(Dependency Injection) 패턴으로 변경하여 테스트 용이성을 확보합니다.

## C. 타입 통합 (packages/shared/src/types/)

trailer-engine의 VideoGenerationRequest, SceneResult, QCReport 등 핵심 타입을 lib-mvp의 shared 패키지로 이동합니다. 기존 VideoStatus enum과 충돌하지 않도록 네임스페이스를 분리합니다.

## D. 저장소 추상화 (packages/worker/src/services/storage.service.ts)

trailer-engine은 로컬 파일시스템 저장. lib-mvp는 S3 업로드가 필요. StorageProvider 인터페이스를 만들어 LocalStorage와 S3Storage를 교체 가능하게 합니다.

## 4. lib-mvp 미구현 항목 상세

개발팀이 완성해야 할 항목을 우선순위별로 정리합니다.

### 4.1 Critical (MVP 차단 - 반드시 해결)

| 항목 | 파일 위치 | 현재 상태 | 필요 작업 | 예상 기간 |
| :--- | :--- | :--- | :--- | :--- |
| trailer-engine 통합 | worker/src/services/ | Mock | 위 3.2절 참조 | 3-4일 |
| FFmpeg 영상 병합 | worker/src/services/videogenerator | Stub | fluent-ffmpeg 연동 | 1-2일 |
| 프로덕션 DB | backend/src/db/ | 인메모리 Map | PostgreSQL + Prisma | 2-3일 |
| 콘텐츠 안전 검증 | worker/src/services/videogenerator:98 | 항상 true | QC safetyGate 통합 | 0.5일 |

### 4.2 Important (기능 완성)

- S 3 클라우드 스토리지: storage.service.ts에 S 3 업로드 구현 + presigned URL 생성 (1-2일)
- ALPAS 실제 API 완성: alpas-real.service.ts 스켈레톤 완성. AD201(검색), AD206(상세), AE117(신착) 3개 (1일)
- Prisma 스키마 마이그레이션: prisma/schema.prisma 정의됨. 마이그레이션 실행 + 리포지토리 전환 (1일)
- WebSocket 실시간 알림: 영상 생성 진행률 DID 키오스크에 실시간 전달 (1일)


### 4.3 Nice-to-have (프로덕션 개선)

- BullMQ Dashboard (모니터링 UI)
- Prometheus + Grafana 메트릭
- E2E 테스트 (Frontend ↔ Backend ↔ Worker)
- 비용 최적화 자동화 (모델 자동 선택)
- DID 키오스크 전용 터치 최적화 완성


## 5. 환경 변수 및 시크릿

통합 후 필요한 모든 환경 변수입니다. .env.example에 반영해야 합니다.

| 변수명 | 용도 | 필수 | 비고 |
| :--- | :--- | :--- | :--- |
| GEMINI_API_KEY | Gemini 2.0 Flash | 필수 | Google AI Studio에서 발급 |
| OPENAI_API_KEY | Sora 2 영상 생성 | 필수 | OpenAI API에서 발급 |
| COMET_API_KEY | Comet Sora (백업) | 선택 | 3rd-party Sora API |
| REDIS_HOST | BullMQ 큐 | 필수 | 기본: localhost |
| REDIS_PORT | Redis 포트 | 필수 | 기본: 6379 |
| VEO_API_ENDPOINT | Veo 3.1 API | 선택 | Vertex AI 엔드포인트 |
| AWS_ACCESS_KEY_ID | S3 스토리지 | 프로덕션 필수 | AWS IAM |
| AWS_SECRET_ACCESS_KEY | S3 인증 | 프로덕션 필수 | AWS IAM |
| S3_BUCKET_NAME | 영상 저장 버킷 | 프로덕션 필수 | 리전: ap-northeast-2 |
| DATABASE_URL | PostgreSQL | 프로덕션 필수 | Prisma 연결 문자열 |
| JWT_SECRET | 관리자 인증 | 필수 | 최소 32자 랜덤 문자열 |
| PORT | 서버 포트 | 선택 | 기본: 3000 |
| NODE_ENV | 실행 환경 | 선택 | development / production |
| STORAGE_TYPE | 저장소 유형 | 선택 | local / s3 |

## 6. 주간 스프린트 계획

1-2주 내 MVP 완성을 위한 구체적 일정입니다.

Week 1 (Day 1-5): 핵심 통합
| 일차 | 작업 | 담당/산출물 | 의존성 |
| :--- | :--- | :--- | :--- |
| D1 | trailer-engine 파일 복사 + import 정리 | worker/src/pipeline, qc, retry/ | 없음 |
| D1 | Config 통합 (env 변수 병합) | worker/src/config/ | 없음 |
| D2 | 타입 통합 (shared 패키지) | shared/src/types/ | D1 |
| D2 | Worker 진입점 수정 (BullMQ → Pipeline) | worker/src/worker.ts | D1 |
| D3 | FFmpeg 영상 병합 실제 구현 | worker/src/services/video-processor | D2 |
| D3 | Storage 추상화 (Local + S3) | worker/src/services/storage | 없음 |
| D4 | PostgreSQL + Prisma 마이그레이션 | backend/src/db/ | 없음 |
| D4 | Repository 전환 (Map → Prisma) | backend/src/repositories/ | D4 DB |
| D5 | E2E 통합 테스트 (한 권 영상 생성) | 전체 파이프라인 | D1-D4 |


Week 2 (Day 6-10): 안정화 + 프로덕션
| 일차 | 작엽 | 담당/산출물 | 의존성 |
| :--- | :--- | :--- | :--- |
| D6 | ALPAS 실제 API 연동 완성 | backend/src/services/alpas | 없음 |
| D6 | QC safetyGate → Worker 안전 검증 교체 | worker/src/services/ | W1 |
| D7 | S3 업로드 + presigned URL 구현 | worker/src/services/storage | AWS 계정 |
| D7 | Docker Compose 통합 빌드 테스트 | docker-compose.yml | 없음 |
| D8 | Frontend ↔ Backend E2E 테스트 | 전체 시스템 | D6-D7 |
| D8 | DID 키오스크 UI 최종 검증 | frontend/src/pages/Did* | D8 E2E |
| D9 | 시크릿 관리 + 배포 스크립트 | ops/ | 없음 |
| D9 | 에러 핸들링 + 로깅 정리 | 전체 | 없음 |
| D10 | 부하 테스트 + 버그 수정 + 릴리스 | 전체 시스템 | D6-D9 |


## 7. 핵심 기술 결정사항 (이종원 메모)

개발팀이 왜 이렇게 했는지 이해할 수 있도록 주요 의사결정 배경을 기록합니다.

## Gemini 2.0 Flash를 스크립트 생성에 사용한 이유

GPT-4 대비 3배 빠르고 비용이 1/10. Temperature 0.7로 창의성과 일관성 균형. 한국어 아동 도서 컨텍스트에서 충분한 품질. 스크립트당 약 $\$ 0.01$.

## Sora 2를 기본 영상 모델로 전환한 이유

초기에는 Veo 3.1을 사용했으나 Sora 2가 텍스트-투-비디오에서 더 안정적이고 빠름. Veo 3.1은 이미지-투-비디오에 강점이 있어 키프레임 기반 생성 시 대안으로 유지. 두 모델 모두 동일 인터페이스로 교체 가능하게 설계.

## 3장면 $\times 8$ 초 고정 구조를 선택한 이유

24 초는 DID 키오스크 사용자의 평균 집중 시간(20-30초). 3장면 구조는 intro(호기심 유발) → body(핵심 소개) → outro(행동 유도)로 아동 도서 마케팅에 최적. 고정 구조는 비용 예측과 QC 표준화에 유리.

## 계층적 재시도를 도입한 이유

영상 생성 비용이 높아(\$2-3/건) 전체 재시도는 비효율적. Script 실패 시 Script만, Video 실패 시 Video만 재시도하면 재시도당 ~\$0.56 절감. 3장면 중 1장면만 실패해도 나머지 2장면은 재사용.

## Safety Gate를 QC 최우선에 둔 이유

아산 꿈샘은 어린이청소년도서관. 부적절한 콘텐츠가 DID에 표시되면 큰 문제. Safety Gate는 zerotolerance(점수 1.0 필수)로 다른 QC 이전에 실행. 보안문서.docx의 저작권 가이드라인도 반영: 줄거리 요약 금지, 분위기 소개만 허용.

## 문서 간 불일치 사항 (개발팀 참고)

- README.md에 Express.js로 표기되어 있으나 실제는 Fastify. 문서 업 데이트 필요
- 꿈샘문서.docx는 24 초/3장면(8초) 명시, trailer-engine은 일부 실험에서 20초/2장면 사용. 프로덕션은 24 초/3장면이 맞음
- Smart DID Proposal은 Veo 3.1만 언급, 실제는 Sora 2가 기본. 제안서 업 데이트 필요


## 8. API 엔드포인트 요약

lib-mvp Backend의 현재 API 목록입니다. 모든 API는 작동하지만, 뒤쪽의 Worker가 Mock이므로 영상 생성 결과만 가짜입니다.

### 8.1 Public DID API (인증 불필요)

| Method | Path | 설명 |
| :--- | :--- | :--- |
| GET | /api/did/new-arrivals | 신착 도서 목록 |
| GET | /api/did/search?q=... | 도서 검색 |
| GET | /api/did/books/:bookld | 도서 상세 정보 |
| GET | /api/did/books/:bookld/video | 영상 상태 조회 (NONE/QUEUED/GENERATING/READY/FAILED) |
| POST | /api/did/books/:bookld/video/request | 영상 생성 요청 (큐에 추가) |
| GET | /api/did/videos/popular | 인기 영상 목록 (rankingScore 정렬) |

### 8.2 Admin API (JWT 인증 필요)

| Method | Path | 설명 |
| :--- | :--- | :--- |
| POST | /api/auth/login | 관리자 로그인 (기본: admin/changeme123) |
| GET | /api/admin/dashboard/stats | 대시보드 통계 |
| POST | /api/admin/seed/bestsellers?limit=100 | 베스트셀러 시딩 |
| GET | /api/admin/queue/stats | 큐 상태 |
| DELETE | /api/admin/queue/:bookld | 작업 취소 |
| POST | /api/admin/queue/:bookld/retry | 실패 작업 재시도 |
| GET | /api/admin/cache/stats | 캐시 통계 |
| POST | /api/admin/cache/cleanup | 수동 캐시 정리 |

## 9. 인수인계 체크리스트

개발팀이 작업 시작 전에 확인해야 할 항목입니다.
9.1 사전 준비

- Google AI Studio에서 GEMINI_API_KEY 발급 확인
- OpenAI API에서 OPENAI_API_KEY 발급 + Sora 2 접 근 권한 확인
- AWS 계정 + S3 버킷(ap-northeast-2) 생성
- PostgreSQL 인스턴스 준비 (로컬 또는 AWS RDS)
- Redis 인스턴스 준비 (로컬 또는 ElastiCache)
- FFmpeg 바이너리 설치 (Docker 이미지에 포함 필요)
- Node.js $18+$ 환경 확인
9.2 코드 체크아웃 후 확인
- npm install (루트 + 각 패키지)
- .env 파일 생성 (5장 환경 변수 참조)
- docker-compose up redis (Redis 먼저 실행)
- npm run dev (3개 서비스 동시 실행 확인)
- http://localhost:3000/health (Backend 헬스체크)
- http://localhost:5173 (Frontend 접속 확인)
9.3 통합 완료 후 검증
- 단일 도서 영상 생성 E2E: DID UI → 요청 → 큐 → Worker → 영상 → 재생
- QC 점수 85 점 이상 확인
- DB 에 영상 기록 영속 확인 (서버 재시작 후에도 유지)
- 캐시 정리 스케줄러 동작 확인
- 관리자 대시보드에서 큐/캐시 통계 표시 확인


## 9.4 이종원 연락처

통합 과정에서 질문이 있으면 아래로 연락해주세요.
이메일: j.lee@genta.co.kr
주요 참고 파일: trailer-engine/src/pipeline/orchestrator.ts (V2 파이프라인 전체 흐름)
테스트 명령: cd trailer-engine \&\& npm run generate:v2 (독립 실행으로 파이프라인 동작 확인 가능)

