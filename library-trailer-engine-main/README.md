# Trailer Engine - 자동 발전형 도서 영상 생성 시스템

어린이청소년 도서관을 위한 자동 도서 소개 영상 생성 엔진

A/B 테스트와 품질 검증을 통해 스스로 발전하는 Self-Improving Video Generation Engine

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 단일 영상 생성
npm run generate

# A/B 테스트 (3개 버전 자동 비교)
npm run ab-test
```

## 📋 명령어

### 영상 생성
- `npm run generate` - 레퍼런스 이미지 기반 영상 생성 (최신 버전)
- `npm run generate:old` - 이전 버전 (레퍼런스 없음)
- `npm run generate:batch` - 배치 생성 (5개)

### A/B 테스트
- `npm run ab-test` - 3개 변형 버전 생성 및 자동 품질 비교

### 개발
- `npm run dev` - 개발 서버 실행
- `npm run build` - TypeScript 빌드
- `npm run clean` - 임시 파일 정리

## 📁 출력 구조

### 단일 생성
```
output/어린왕자/2026-01-15_10-31/
├── 어린왕자_도서소개.mp4      # 최종 영상
├── script.json                # 시나리오
├── subtitle.vtt               # 자막
├── README.md                  # 메타데이터
├── keyframes/                 # 씬 키프레임
│   ├── scene-1.png
│   ├── scene-2.png
│   └── scene-3.png
└── references/                # 캐릭터 레퍼런스
    ├── reference-front.png
    ├── reference-three-quarter.png
    └── reference-full-body.png
```

### A/B 테스트
```
output/어린왕자/ab-test_2026-01-15_10-45/
├── ab-test-summary.json       # 테스트 결과 요약
├── variant-1/                 # 버전 1
│   ├── 어린왕자_도서소개.mp4
│   ├── variant-config.json    # 이 버전의 설정
│   └── ...
├── variant-2/                 # 버전 2
│   └── ...
└── variant-3/                 # 버전 3
    └── ...
```

## 🔧 시스템 구성

### 1. 기본 생성 파이프라인
```
시나리오 생성 (Gemini 2.0 Flash)
  ↓
레퍼런스 이미지 생성 (Imagen 4.0) x5
  ↓
씬 키프레임 생성 (Imagen 4.0) x3
  ↓
비디오 생성 (Veo 3.1) x3
  ↓
후처리 (FFmpeg: 병합, 자막, 음소거)
  ↓
최종 영상 (24초)
```

### 2. QC Agent (품질 검증)
```typescript
// 100점 만점 스코어링
- 구조 점수: 30점 (3-Act 구조 준수)
- 일관성 점수: 30점 (캐릭터/화풍 일관성)
- 한국어 점수: 20점 (자연스러움)
- 기술 점수: 20점 (파일, 자막 등)

// 등급
- A: 90점 이상 (통과)
- B: 80-89점 (경고)
- C: 70-79점 (주의)
- F: 70점 미만 (재생성)
```

### 3. A/B Testing
```
동일 책에 대해 N개 버전 생성
  ↓
각 버전에 다른 설정 적용
  - 프롬프트 스타일
  - 나레이션 톤
  - 색감
  - 캐릭터 디테일
  ↓
QC Agent로 모두 검증
  ↓
점수 기반 자동 정렬
  ↓
최고 품질 버전 선택 (🥇)
```

## 📊 주요 기능

### ✅ 완료
- [x] 기본 생성 파이프라인 (Gemini + Imagen + Veo)
- [x] 레퍼런스 이미지 기반 일관성 향상
- [x] 텍스트 오버레이 방지
- [x] 자연스러운 한국어 나레이션
- [x] 현대적인 자막 스타일
- [x] QC Agent 구현
- [x] A/B Testing 시스템

### 🚧 진행 중
- [ ] 최종 영상 기반 QC (현재는 키프레임만)
- [ ] 자동 재생성 로직
- [ ] 학습 시스템 (생성 기록 DB)

### 📝 계획
- [ ] 여러 책 동시 생성
- [ ] 큐 시스템 (BullMQ)
- [ ] 모니터링 대시보드 (Grafana)
- [ ] 웹 UI

## 🎯 성능 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| QC 평균 점수 | 88점 | 93점 |
| 생성 시간 | 7분 | 4분 |
| 책당 비용 | $0.80 | $0.50 |
| 캐릭터 일관성 | 85% | 95% |

## 🔑 환경 변수

`.env` 파일 필요:
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
OUTPUT_DIR=./output
TEMP_DIR=./temp
```

## 📚 더 알아보기

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - 전체 시스템 구조 상세 설명
- [src/agents/qc-agent.ts](./src/agents/qc-agent.ts) - QC Agent 구현
- [src/test/ab-test-generate.ts](./src/test/ab-test-generate.ts) - A/B Testing 시스템

## 🤝 기여

이슈나 개선 제안은 GitHub Issues에 등록해주세요.

## 📄 라이선스

MIT
