# FFmpeg 영상 병합 실제 연동 — 필요한 것

**목표:** Pipeline V2 Step 7에서 장면 비디오 3개를 1개로 병합하고, 자막을 입혀 최종 mp4를 만든 뒤 저장·URL 반환.

---

## 1. 환경/시스템

| 항목 | 내용 |
|------|------|
| **FFmpeg 바이너리** | 시스템에 `ffmpeg`, `ffprobe` 설치되어 있고 PATH에 있어야 함. |
| **설치 예시** | macOS: `brew install ffmpeg` / Ubuntu: `apt install ffmpeg` / Docker: Dockerfile에 `RUN apt-get install -y ffmpeg` 등 |
| **확인** | 터미널에서 `ffmpeg -version`, `ffprobe -version` 실행해 확인 |

---

## 2. 패키지 의존성 (worker)

| 패키지 | 용도 |
|--------|------|
| **fluent-ffmpeg** | Node에서 FFmpeg 명령을 조립·실행하는 래퍼. `video-processor.ts`가 이미 `import ffmpeg from 'fluent-ffmpeg'` 사용 중. |
| **@types/fluent-ffmpeg** | TypeScript 타입 (devDependency). |

**현재:** `packages/worker/package.json`에 **fluent-ffmpeg가 없음**.  
→ 추가 필요: `npm install fluent-ffmpeg` / `npm install -D @types/fluent-ffmpeg` (worker 디렉터리 또는 루트 워크스페이스).

---

## 3. 코드 연동 (Pipeline V2 Step 7)

**현재 상태**

- Step 5: 각 장면의 `videoBuffer`(Buffer), `videoUrl`(임시 문자열 `temp://video-1-xxx.mp4`)만 설정. **파일로 저장하지 않음.**
- Step 6: 자막 문자열(VTT) 생성하지만 **파일로 저장하지 않음.** `subtitleUrl`만 경로 문자열로 설정.
- Step 7: **아무 호출 없이** `videoUrl = output/videos/${jobId}.mp4` 같은 placeholder만 넣고 "Assembly skipped" 로그만 출력.

**필요한 작업**

| 단계 | 할 일 |
|------|--------|
| **1) 장면 비디오를 파일로 저장** | Step 5 직후(또는 Step 7 진입 시) 각 `scene.videoBuffer`를 `config.tempDir` 또는 `config.outputDir` 아래에 `scene_1.mp4`, `scene_2.mp4`, `scene_3.mp4` 등으로 쓰기. 경로 목록을 배열로 확보. |
| **2) 자막 파일 저장** | Step 6에서 생성한 VTT 문자열을 `config.outputDir/subtitles/${jobId}.vtt` (또는 동일 규칙)에 실제로 `fs.writeFile`. `subtitlePath` 변수에 절대/상대 경로 저장. |
| **3) Step 7에서 VideoProcessor 호출** | `VideoProcessor` 인스턴스 생성 후: (1) `concatenateVideos(장면_경로_배열, 합친_임시_경로)` 호출 → (2) `addSubtitles(합친_경로, 자막_경로, 최종_경로)` 호출. |
| **4) 최종 경로 → 저장·URL** | 최종 mp4 경로를 `config.storage.path` 또는 StorageProvider에 저장하고, 반환하는 `videoUrl`을 그 저장 경로/URL로 설정. (지금은 로컬이면 파일 경로 또는 `/storage/...` 형태.) |
| **5) 임시 파일 정리** | 병합 후 장면 임시 mp4, concat 임시 파일 등 삭제(선택, 디스크 절약). |

**사용할 모듈**

- **video-processor.ts**  
  - `concatenateVideos(videoPaths: string[], outputPath: string)`  
  - `addSubtitles(videoPath, subtitlePath, outputPath)`  
  - 이미 구현되어 있음. **입력은 모두 파일 경로**여야 함.
- **assemble.ts**  
  - `VideoAssembler.assemble(scenes, subtitlePath, outputPath, bookTitle)`  
  - 내부에서 `exec('ffmpeg ...')` 사용. `scenes[].videoUrl`이 **실제 파일 경로**여야 함.  
  - 둘 중 하나만 써도 됨: VideoProcessor만 쓸지, VideoAssembler만 쓸지 정한 뒤 한 경로로 통일하는 게 좋음.

---

## 4. 설정값 (이미 있음)

- `config.outputDir` — 출력 루트 (예: `./output`)
- `config.tempDir` — 임시 파일 (예: `./temp`)
- `config.storage.path` — 최종 영상 저장 경로 (예: `./storage/videos`)
- `config.video.format` — mp4 등

Step 7에서 위 값을 사용해  
`tempDir`에 장면·합친 파일, `outputDir/subtitles`에 자막, `storage.path`(또는 StorageProvider)에 최종 mp4를 두면 됨.

---

## 5. 요약 체크리스트

- [ ] 시스템에 **FFmpeg·ffprobe** 설치 및 PATH 확인
- [ ] worker에 **fluent-ffmpeg**, **@types/fluent-ffmpeg** 추가
- [ ] Pipeline V2에서 **장면 videoBuffer → 임시 파일 저장** 후 경로 배열 확보
- [ ] **자막 VTT 내용 → 파일 저장** 후 subtitlePath 확보
- [ ] Step 7에서 **VideoProcessor.concatenateVideos + addSubtitles** (또는 VideoAssembler.assemble) 호출
- [ ] **최종 mp4**를 저장 경로에 두고, 그 경로/URL을 `videoUrl`·`subtitleUrl`로 반환
- [ ] (선택) 임시 파일 삭제, 에러 시 정리

이렇게 하면 “FFmpeg 영상 병합 실제 연동”에 필요한 것은 모두 갖춰집니다.
