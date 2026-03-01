# 아산도서관 스마트 DID 설치 가이드 (Windows)

## 1. 사전 준비

### 1.1 Chrome 브라우저 설치
키오스크에서 웹페이지를 표시하기 위해 Chrome이 필요합니다.
- https://www.google.com/chrome/ 에서 다운로드 및 설치

### 1.2 네트워크 확인
키오스크가 인터넷에 연결되어 있는지 확인합니다.

---

## 2. 키오스크 설정

### 2.1 Chrome 키오스크 모드로 실행

1. **바탕화면에 바로가기 만들기**
   - 바탕화면에서 마우스 우클릭 → `새로 만들기` → `바로 가기`

2. **다음 경로 입력:**
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --start-fullscreen https://smart-did-frontend-xxxxxxxxxx-du.a.run.app
   ```
   > ⚠️ URL은 실제 배포된 Frontend URL로 변경하세요

3. **바로가기 이름:** `스마트DID` 또는 원하는 이름

4. **바로가기 더블클릭**으로 실행 확인

### 2.2 키오스크 모드 종료 방법
- `Alt + F4` 키를 눌러 종료
- 또는 `Ctrl + W`로 탭 닫기

---

## 3. Windows 시작 시 자동 실행 설정

키오스크가 부팅될 때 자동으로 웹페이지가 열리도록 설정합니다.

### 방법 1: 시작 프로그램 폴더 사용

1. `Win + R` 키를 눌러 실행 창 열기
2. `shell:startup` 입력 후 Enter
3. 열린 폴더에 위에서 만든 바로가기를 복사/붙여넣기

### 방법 2: 작업 스케줄러 사용 (권장)

1. `Win + S` → "작업 스케줄러" 검색 → 실행
2. 오른쪽 패널에서 `기본 작업 만들기` 클릭
3. 설정:
   - **이름:** 스마트DID 자동실행
   - **트리거:** 로그온할 때
   - **동작:** 프로그램 시작
   - **프로그램/스크립트:** `"C:\Program Files\Google\Chrome\Application\chrome.exe"`
   - **인수 추가:** `--kiosk --start-fullscreen https://smart-did-frontend-xxxxxxxxxx-du.a.run.app`

---

## 4. 화면 설정 (1080x1920 세로 모드)

### 4.1 디스플레이 회전 설정

1. 바탕화면에서 마우스 우클릭 → `디스플레이 설정`
2. `디스플레이 방향` 항목에서 `세로` 선택
3. `변경한 설정 유지` 클릭

### 4.2 해상도 확인
- 해상도가 `1080 x 1920` 또는 `1920 x 1080`인지 확인
- 세로 모드로 회전하면 자동으로 1080x1920이 됩니다

---

## 5. 추가 설정 (선택사항)

### 5.1 마우스 커서 숨기기

터치스크린 키오스크에서 마우스 커서를 숨기려면:

1. `제어판` → `마우스` → `포인터` 탭
2. `구성표`에서 `없음` 선택
3. 또는 AutoHotkey 스크립트 사용:
   ```
   ; hide_cursor.ahk
   SystemCursor("Off")
   return
   
   SystemCursor(OnOff=1) {
       static c
       if !c
           c := DllCall("CreateCursor", "Ptr", 0, "Int", 0, "Int", 0, "Int", 1, "Int", 1, "Ptr", &AndMask := 0xFF, "Ptr", &XorMask := 0x00, "Ptr")
       DllCall("SetSystemCursor", "Ptr", OnOff ? c : 0, "Int", 32512)
   }
   ```

### 5.2 Windows 자동 로그인 설정

1. `Win + R` → `netplwiz` 입력 → Enter
2. `사용자 이름과 암호를 입력해야 이 컴퓨터를 사용할 수 있음` 체크 해제
3. 확인 클릭 후 비밀번호 입력

### 5.3 화면 보호기 및 절전 모드 끄기

1. `설정` → `시스템` → `전원 및 절전`
2. 화면 끄기: `안 함`
3. 절전 모드: `안 함`

---

## 6. 문제 해결

### 6.1 화면이 안 나올 때
- 인터넷 연결 확인
- URL이 올바른지 확인
- Chrome 캐시 삭제: `Ctrl + Shift + Delete`

### 6.2 영상이 재생 안 될 때
- Chrome 최신 버전인지 확인
- 네트워크 속도 확인

### 6.3 터치가 안 될 때
- 터치스크린 드라이버 확인
- 장치 관리자에서 터치스크린 장치 상태 확인

### 6.4 키오스크 모드 종료가 안 될 때
- `Ctrl + Alt + Delete` → 작업 관리자 → Chrome 종료

---

## 7. 배포 URL 정보

| 서비스 | URL |
|--------|-----|
| Frontend | `https://smart-did-frontend-xxxxxxxxxx-du.a.run.app` |
| Backend API | `https://smart-did-backend-xxxxxxxxxx-du.a.run.app` |

> ⚠️ 실제 URL은 GCP Cloud Run 콘솔에서 확인하세요.

---

## 8. 긴급 연락처

기술 지원이 필요한 경우:
- 담당자: [담당자명]
- 연락처: [연락처]
- 이메일: [이메일]

---

## 부록: 빠른 설치 체크리스트

- [ ] Chrome 브라우저 설치됨
- [ ] 인터넷 연결 확인됨
- [ ] 바로가기 생성 및 테스트 완료
- [ ] 자동 실행 설정 완료
- [ ] 화면 세로 모드(1080x1920) 설정 완료
- [ ] 절전 모드 해제됨
- [ ] 터치스크린 동작 확인됨
