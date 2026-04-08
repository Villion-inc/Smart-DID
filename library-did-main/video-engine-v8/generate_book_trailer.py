"""
도서관 영상 자동 생성 v5 — 26초 예고편 포맷
구조: 설정샷(4s) → 로그라인(4s) → 분위기샷(6s) → 감정샷(4s) → 질문(4s) → 타이틀(4s)
"""

import json
import os
import subprocess
import time
import re
from io import BytesIO
from pathlib import Path

import requests
from google import genai
from google.genai import types
from google.genai.types import GenerateContentConfig, Modality, Part
from PIL import Image

# ── 설정 ──
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "")
DATA4LIB_KEY = os.environ.get("DATA4LIBRARY_AUTH_KEY", "")
ALADIN_KEY = os.environ.get("ALADIN_TTB_KEY", "")

# ── CLI 인자 (worker에서 호출 시) ──
import argparse
_parser = argparse.ArgumentParser(add_help=False)
_parser.add_argument("--title", default="")
_parser.add_argument("--author", default="")
_parser.add_argument("--output", default="")  # 최종 mp4 저장 경로
_args, _ = _parser.parse_known_args()

# ── 책 설정 (CLI > 기본값) ──
BOOK_TITLE = _args.title or "마당을 나온 암탉"
BOOK_AUTHOR = _args.author or "황선미"
OUTPUT_PATH = _args.output or ""  # 지정 시 해당 경로로 최종 파일 복사

OUT_DIR = Path(__file__).parent / "output" / BOOK_TITLE.replace(" ", "_")
OUT_DIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=GOOGLE_API_KEY)
time_log = {}

# 폰트: Docker 환경 fallback
FONT = next((f for f in [
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
] if Path(f).exists()), "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")


def log_step(name):
    time_log[name] = {"start": time.time()}
    print(f"\n{'='*60}")
    print(f"  [{name}]")
    print(f"{'='*60}")


def end_step(name):
    elapsed = time.time() - time_log[name]["start"]
    time_log[name]["elapsed"] = elapsed
    print(f"  완료 ({elapsed:.1f}초)")


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s)


# ═══════════════════════════════════════════════════════
# STEP 1: 줄거리 수집 (교보문고 → 정보나루 → 네이버 → Gemini)
# ═══════════════════════════════════════════════════════
def fetch_book_description(title: str, author: str = "", isbn: str = "") -> dict:
    """여러 소스에서 줄거리를 수집하고 Gemini로 정제"""
    log_step("1. 줄거리 수집")

    descriptions = []

    # 1차: 알라딘 (가장 풍부한 줄거리)
    aladin_desc = fetch_aladin_description(title)
    if aladin_desc:
        descriptions.append(("알라딘", aladin_desc))
        print(f"  ✓ 알라딘: {len(aladin_desc)}자")

    # 2차: 정보나루 (ISBN 기반)
    if isbn:
        try:
            resp = requests.get("http://data4library.kr/api/srchDtlList", params={
                "authKey": DATA4LIB_KEY, "isbn13": isbn, "format": "json"
            }, timeout=5)
            detail = resp.json().get("response", {}).get("detail", [])
            if detail:
                desc = detail[0].get("book", {}).get("description", "")
                desc = re.sub(r"&lt;|&gt;", "", desc)
                desc = strip_html(desc)
                if desc and len(desc) > 30:
                    descriptions.append(("정보나루", desc))
                    print(f"  ✓ 정보나루: {len(desc)}자")
        except Exception as e:
            print(f"  ⚠ 정보나루: {e}")

    # 3차: 네이버 도서
    try:
        resp = requests.get("https://openapi.naver.com/v1/search/book.json",
            params={"query": f"{title} {author}".strip(), "display": "1"},
            headers={"X-Naver-Client-Id": NAVER_CLIENT_ID, "X-Naver-Client-Secret": NAVER_CLIENT_SECRET},
            timeout=5)
        items = resp.json().get("items", [])
        if items:
            desc = strip_html(items[0].get("description", ""))
            if desc and len(desc) > 30:
                descriptions.append(("네이버", desc))
                print(f"  ✓ 네이버: {len(desc)}자")
    except Exception as e:
        print(f"  ⚠ 네이버: {e}")

    if not descriptions:
        print(f"  ⚠ 외부 소스 없음 — Gemini가 책 제목으로 추론")

    # Gemini로 정제 (원문 그대로 사용 금지, 리라이트)
    combined = "\n\n".join([f"[{src}]\n{desc}" for src, desc in descriptions])

    end_step("1. 줄거리 수집")
    return {
        "title": title,
        "author": author,
        "raw_descriptions": combined,
        "source_count": len(descriptions),
    }


def fetch_aladin_description(title: str) -> str:
    """알라딘 Open API에서 줄거리 가져오기 (검색 → 상세)"""
    try:
        # 검색
        search_url = (
            f"http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?"
            f"ttbkey={ALADIN_KEY}&Query={requests.utils.quote(title)}"
            f"&MaxResults=1&output=js&Version=20131101"
        )
        resp = requests.get(search_url, timeout=5)
        text = resp.text.strip().lstrip(";")
        data = json.loads(text)
        items = data.get("item", [])
        if not items:
            return ""

        item_id = items[0].get("itemId")

        # 상세
        detail_url = (
            f"http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?"
            f"ttbkey={ALADIN_KEY}&itemIdType=ItemId&ItemId={item_id}"
            f"&output=js&Version=20131101&OptResult=fulldescription"
        )
        resp2 = requests.get(detail_url, timeout=5)
        text2 = resp2.text.strip().lstrip(";")
        data2 = json.loads(text2)
        items2 = data2.get("item", [])
        if not items2:
            return ""

        item = items2[0]
        # fullDescription > description 우선
        for field in ["fullDescription", "fullDescription2", "description"]:
            desc = item.get(field, "")
            if desc and len(strip_html(desc)) > 30:
                return strip_html(desc)[:2000]

        return ""
    except Exception:
        return ""


# ═══════════════════════════════════════════════════════
# STEP 2: 시나리오 생성 (26초 예고편)
# ═══════════════════════════════════════════════════════
def generate_scenario(book_info: dict) -> dict:
    log_step("2. 시나리오 생성")

    prompt = f"""당신은 도서 소개 영상 감독입니다. 26초짜리 애니메이션 북 트레일러를 기획하세요.

## 책 정보
- 제목: {book_info['title']}
- 저자: {book_info['author']}
- 참고 자료:
{book_info['raw_descriptions'][:1500] if book_info['raw_descriptions'] else '(외부 소스 없음 — 책 제목으로 추론하세요)'}

## ⚠️ 핵심 규칙
1. 위 참고 자료를 절대 그대로 복사하지 마세요
2. 참고 자료를 바탕으로 새롭게 리라이트하세요
3. 등장인물 이름, 고유 장소명, 브랜드명 절대 사용 금지
4. 스포일러 금지
5. 로그라인은 완전히 새로운 문장으로 작성

## 26초 구조

[0:00~0:04] 설정샷 (establishing shot)
- 책의 핵심 배경을 보여주는 넓은 시네마틱 애니메이션
- 분위기, 무드, 미세한 움직임 (바람, 빛 등)
- 인물 클로즈업 없음, 풍경 위주

[0:04~0:08] 검은 화면 + 로그라인 텍스트
- AI가 새로 작성한 오리지널 로그라인 (30자 이내)
- 참고 자료 문장 그대로 사용 금지

[0:08~0:14] 분위기샷 (mood shot, 6초) ★NEW
- 책의 핵심 감성/무드를 전달하는 장면
- 설정샷보다 가까이, 감정샷보다 멀리 (중간 거리)
- 빛의 변화, 계절감, 날씨, 오브젝트 클로즈업 등
- 책이 주는 감정 (따뜻함/긴장감/설렘/슬픔 등)을 시각적으로

[0:14~0:18] 감정샷 (emotional moment)
- 한 인물의 실루엣이 무언가를 바라보거나 결정하는 순간
- 감정, 호기심, 조용한 긴장감

[0:18~0:22] 검은 화면 + 질문 텍스트
- 로그라인에서 변환한 흥미로운 질문 (25자 이내)

[0:22~0:26] 타이틀 카드
- 검은 화면에 책 제목

## 응답 형식 (JSON)
{{
  "logline": "오리지널 로그라인 30자 이내 (참고 자료 복사 금지)",
  "question": "흥미로운 질문 25자 이내",
  "scene1": {{
    "name": "설정샷",
    "duration": 4,
    "description": "한국어 설명",
    "keyframePrompt": "영어. Soft hand-drawn animation style with visible brush textures, warm golden lighting, poetic emotional tone. Wide cinematic establishing shot. [배경]. 16:9, high quality. No text, no subtitles, no watermarks. Original illustration.",
    "animationPrompt": "영어. Slow gentle camera push-in. SILENT VIDEO. No audio. No sound. No music. No text on screen."
  }},
  "scene2": {{
    "name": "분위기샷",
    "duration": 6,
    "description": "한국어 설명 (책의 핵심 감성/무드)",
    "keyframePrompt": "영어. 동일 스타일. Medium shot. [분위기 묘사 — 빛, 오브젝트, 날씨 등]. 16:9. No text. Original illustration.",
    "animationPrompt": "영어. Slow panning or gentle zoom. Atmospheric particles, light changes. SILENT VIDEO. No audio. No sound. No music. No text on screen."
  }},
  "scene3": {{
    "name": "감정샷",
    "duration": 4,
    "description": "한국어 설명",
    "keyframePrompt": "영어. 동일 스타일. A silhouette of a person [행동]. Emotional tone. 16:9. No text. Original illustration.",
    "animationPrompt": "영어. Minimal camera movement. SILENT VIDEO. No audio. No sound. No music. No text on screen."
  }}
}}

## 키프레임 공통 스타일
- "Soft hand-drawn animation style with visible brush textures, warm golden lighting, poetic emotional tone"
- 브랜드명(Ghibli, Pixar, Disney 등) 절대 사용 금지
- 3장 모두 동일한 색감/화풍/질감

JSON만 반환:"""

    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    text = response.text.strip().replace("```json", "").replace("```", "").strip()
    scenario = json.loads(text)

    print(f"  ✓ 로그라인: {scenario['logline']}")
    print(f"  ✓ 질문: {scenario['question']}")
    for key in ["scene1", "scene2", "scene3"]:
        s = scenario[key]
        print(f"  ✓ {s['name']} ({s['duration']}s): {s['description'][:50]}...")

    with open(OUT_DIR / "scenario.json", "w", encoding="utf-8") as f:
        json.dump(scenario, f, ensure_ascii=False, indent=2)

    end_step("2. 시나리오 생성")
    return scenario


# ═══════════════════════════════════════════════════════
# STEP 3: 키프레임 3장 생성
# ═══════════════════════════════════════════════════════
def generate_keyframes(scenario: dict) -> list[Path]:
    log_step("3. 키프레임 생성 (나노바나나프로)")

    scenes = [("scene1", scenario["scene1"]), ("scene2", scenario["scene2"]), ("scene3", scenario["scene3"])]
    keyframe_paths = []
    ref_bytes = None

    for i, (name, scene) in enumerate(scenes):
        kf_path = OUT_DIR / f"{name}_keyframe.png"
        print(f"\n  → {scene['name']} ({scene['duration']}s) 생성 중...")
        t0 = time.time()

        contents = []
        if ref_bytes:
            contents.append(Part.from_bytes(data=ref_bytes, mime_type="image/png"))
            contents.append(Part.from_text(text=(
                "CRITICAL: Match the EXACT SAME art style, color palette, brush texture, "
                "and lighting quality as the attached reference image.\n\n"
            )))
        contents.append(Part.from_text(text=scene["keyframePrompt"]))

        try:
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=contents,
                config=GenerateContentConfig(response_modalities=[Modality.TEXT, Modality.IMAGE]),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    img = Image.open(BytesIO(part.inline_data.data))
                    img.save(str(kf_path))
                    keyframe_paths.append(kf_path)
                    if i == 0:
                        ref_bytes = part.inline_data.data
                    print(f"    ✓ {kf_path.name} ({img.size[0]}x{img.size[1]}) — {time.time()-t0:.1f}초")
                    break
            else:
                print(f"    ✗ 이미지 없음")
        except Exception as e:
            print(f"    ✗ 오류: {e}")

        time.sleep(3)

    end_step("3. 키프레임 생성 (나노바나나프로)")
    return keyframe_paths


# ═══════════════════════════════════════════════════════
# STEP 4: Veo 3.1 영상 3개 생성 (4s, 6s, 4s)
# ═══════════════════════════════════════════════════════
def generate_videos(scenario: dict, keyframe_paths: list[Path]) -> list[Path]:
    log_step("4. 영상 생성 (Veo 3.1)")

    scenes = [("scene1", scenario["scene1"]), ("scene2", scenario["scene2"]), ("scene3", scenario["scene3"])]
    video_paths = []

    for i, ((name, scene), kf_path) in enumerate(zip(scenes, keyframe_paths)):
        video_path = OUT_DIR / f"{name}_video.mp4"

        if video_path.exists():
            print(f"  [스킵] {scene['name']} 이미 존재")
            video_paths.append(video_path)
            continue

        print(f"\n  → {scene['name']} ({scene['duration']}s) Veo 3.1 생성 중...")
        t0 = time.time()

        with open(kf_path, "rb") as f:
            image_bytes = f.read()

        try:
            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=scene["animationPrompt"],
                image=types.Image(image_bytes=image_bytes, mime_type="image/png"),
                config=types.GenerateVideosConfig(aspect_ratio="16:9", number_of_videos=1),
            )
            wait = 0
            while not operation.done:
                wait += 1
                if wait % 6 == 0:
                    print(f"      ... {wait*10}초 경과")
                time.sleep(10)
                operation = client.operations.get(operation)

            if operation.result and operation.result.generated_videos:
                video = operation.result.generated_videos[0]
                vid_bytes = client.files.download(file=video.video)
                with open(video_path, "wb") as f:
                    f.write(vid_bytes)
                print(f"    ✓ 완료 ({time.time()-t0:.0f}초)")
                video_paths.append(video_path)
            else:
                print(f"    ✗ 생성 실패")
        except Exception as e:
            print(f"    ✗ 오류: {e}")

        time.sleep(5)

    end_step("4. 영상 생성 (Veo 3.1)")
    return video_paths


# ═══════════════════════════════════════════════════════
# STEP 5: FFmpeg 조립 (26초 예고편)
# ═══════════════════════════════════════════════════════
def assemble_video(scenario: dict, video_paths: list[Path], book_title: str) -> Path:
    log_step("5. FFmpeg 조립")

    final_path = OUT_DIR / "final_trailer.mp4"
    W, H, FPS = 1280, 720, 30

    def esc(t):
        return t.replace("\\", "\\\\\\\\").replace("'", "'\\\\\\''").replace(":", "\\\\:").replace("%", "%%")

    durations = [scenario[f"scene{i+1}"]["duration"] for i in range(3)]  # [4, 6, 4]

    # ── 영상 클립 trim/slowmo ──
    trimmed = []
    for i, (vp, dur) in enumerate(zip(video_paths, durations)):
        tp = OUT_DIR / f"trim_{i+1}.mp4"
        src_dur = get_duration(vp)
        vf = f"fps={FPS},format=yuv420p,scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black"
        if src_dur < dur:
            speed = src_dur / dur
            vf = f"setpts={1/speed:.4f}*PTS,{vf}"
        subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", str(vp), "-t", str(dur), "-vf", vf,
                        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-an", str(tp)], check=True)
        trimmed.append(tp)
        print(f"  ✓ {scenario[f'scene{i+1}']['name']} trimmed to {dur}s")

    # ── 검은 화면 3개 ──
    text_screens = [
        ("logline", scenario["logline"], 4),
        ("question", scenario["question"], 4),
        ("title", book_title, 4),
    ]

    black_clips = []
    for name, text, dur in text_screens:
        bp = OUT_DIR / f"black_{name}.mp4"
        lines = split_korean(text, 15)
        font_size = 48 if name == "title" else 38

        filters = []
        gap = 16
        total_h = len(lines) * font_size + (len(lines) - 1) * gap
        for idx, line in enumerate(lines):
            y_off = (H - total_h) // 2 + idx * (font_size + gap)
            filters.append(
                f"drawtext=text='{esc(line)}':fontfile={FONT}:fontsize={font_size}:fontcolor=white"
                f":shadowcolor=black@0.5:shadowx=2:shadowy=2"
                f":x=(w-text_w)/2:y={y_off}:enable='between(t,0,{dur})'"
            )
        filters.append(f"fade=t=in:st=0:d=0.8")
        filters.append(f"fade=t=out:st={dur-0.8}:d=0.8")

        subprocess.run([
            "ffmpeg", "-y", "-v", "quiet",
            "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:d={dur}:r={FPS}",
            "-vf", ",".join(filters),
            "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-an", str(bp)
        ], check=True)
        black_clips.append(bp)
        print(f"  ✓ {name} ({dur}s)")

    # ── 6개 클립 순서: 설정샷 → 로그라인 → 분위기샷 → 감정샷 → 질문 → 타이틀 ──
    clip_order = [trimmed[0], black_clips[0], trimmed[1], trimmed[2], black_clips[1], black_clips[2]]
    clip_durations = [durations[0], 4, durations[1], durations[2], 4, 4]

    # normalize
    normed = []
    for i, cp in enumerate(clip_order):
        np = OUT_DIR / f"normed_{i}.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", str(cp),
                        "-vf", f"fps={FPS},format=yuv420p,scale={W}:{H}",
                        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-an", str(np)], check=True)
        normed.append(np)

    # xfade chain (6 clips, 5 transitions)
    xf = 0.3
    fc_parts = [f"[{i}:v]settb=AVTB[n{i}]" for i in range(6)]

    offsets = []
    acc = clip_durations[0] - xf
    offsets.append(acc)
    for j in range(1, 5):
        acc += clip_durations[j] - xf
        offsets.append(acc)

    xf_chain = (
        f"[n0][n1]xfade=transition=fade:duration={xf}:offset={offsets[0]}[x01]; "
        f"[x01][n2]xfade=transition=fade:duration={xf}:offset={offsets[1]}[x02]; "
        f"[x02][n3]xfade=transition=fade:duration={xf}:offset={offsets[2]}[x03]; "
        f"[x03][n4]xfade=transition=fade:duration={xf}:offset={offsets[3]}[x04]; "
        f"[x04][n5]xfade=transition=fade:duration={xf}:offset={offsets[4]}[vout]"
    )

    fc = "; ".join(fc_parts) + "; " + xf_chain
    cmd = ["ffmpeg", "-y", "-v", "quiet"]
    for n in normed:
        cmd += ["-i", str(n)]
    cmd += ["-filter_complex", fc, "-map", "[vout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an",
            str(OUT_DIR / "concat.mp4")]
    subprocess.run(cmd, check=True)

    total_dur = get_duration(OUT_DIR / "concat.mp4")
    print(f"  ✓ 이어붙이기 완료 ({total_dur:.1f}초)")

    # ── AI 면책 오버레이 (정중앙, 굵게) ──
    disclaimer = [
        f"drawtext=text='{esc('AI가 생성한 도서 소개 영상입니다')}':fontfile={FONT}:fontsize=24:fontcolor=white"
        f":shadowcolor=black@0.8:shadowx=2:shadowy=2"
        f":x=(w-text_w)/2:y=(h-text_h)/2-16:enable='between(t,0.3,2.5)'",

        f"drawtext=text='{esc('실제 책의 내용과 다를 수 있습니다')}':fontfile={FONT}:fontsize=20:fontcolor=#E0E0E0"
        f":shadowcolor=black@0.7:shadowx=2:shadowy=2"
        f":x=(w-text_w)/2:y=(h+text_h)/2+8:enable='between(t,0.3,2.5)'",

        "fade=t=in:st=0:d=0.5",
        f"fade=t=out:st={total_dur-0.8:.1f}:d=0.8",
    ]

    subprocess.run([
        "ffmpeg", "-y", "-v", "quiet", "-i", str(OUT_DIR / "concat.mp4"),
        "-vf", ",".join(disclaimer),
        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-an", str(final_path)
    ], check=True)

    print(f"  ✓ 최종: {final_path.name} ({get_duration(final_path):.1f}초)")
    end_step("5. FFmpeg 조립")
    return final_path


def split_korean(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    for sep in ['. ', ', ', ' ']:
        mid = len(text) // 2
        left = text.rfind(sep, 0, mid + 5)
        right = text.find(sep, mid - 5)
        if left > 0:
            return [text[:left + len(sep)].strip(), text[left + len(sep):].strip()]
        if right > 0:
            return [text[:right].strip(), text[right + len(sep):].strip()]
    return [text[:max_chars], text[max_chars:]]


def get_duration(p: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(p)],
        capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except:
        return 0.0


def main():
    total_start = time.time()
    print("=" * 60)
    print(f"  도서관 영상 자동 생성 v5 — {BOOK_TITLE}")
    print(f"  구조: 설정샷(4s) → 로그라인(4s) → 분위기샷(6s) → 감정샷(4s) → 질문(4s) → 타이틀(4s)")
    print("=" * 60)

    book_info = fetch_book_description(BOOK_TITLE, BOOK_AUTHOR)
    scenario = generate_scenario(book_info)

    for f in OUT_DIR.glob("scene*_video.mp4"):
        f.unlink()

    keyframe_paths = generate_keyframes(scenario)
    if len(keyframe_paths) < 3:
        print("\n❌ 키프레임 생성 실패")
        return

    video_paths = generate_videos(scenario, keyframe_paths)
    if len(video_paths) < 3:
        print("\n❌ 영상 생성 실패")
        return

    final = assemble_video(scenario, video_paths, BOOK_TITLE)

    # --output 지정 시 해당 경로로 복사
    if OUTPUT_PATH:
        import shutil
        shutil.copy2(str(final), OUTPUT_PATH)
        final = Path(OUTPUT_PATH)

    total_elapsed = time.time() - total_start
    print(f"\n{'='*60}")
    print(f"  ✅ 완료!")
    print(f"{'='*60}")
    print(f"  최종 영상: {final}")
    # worker가 파싱할 수 있도록 마지막 줄에 경로 출력
    print(f"OUTPUT_FILE={final}")
    print(f"  총 소요: {total_elapsed:.0f}초 ({total_elapsed/60:.1f}분)")
    print()
    print("  [구조]")
    print(f"    0:00~0:04  설정샷")
    print(f"    0:04~0:08  \"{scenario['logline']}\"")
    print(f"    0:08~0:14  분위기샷 (6초)")
    print(f"    0:14~0:18  감정샷")
    print(f"    0:18~0:22  \"{scenario['question']}\"")
    print(f"    0:22~0:26  \"{BOOK_TITLE}\"")
    print()
    print(f"  줄거리 소스: {book_info['source_count']}개")
    print(f"  한 편당 비용: ~$0.42 (~₩600) — 키프레임 3장 + 영상 3개")


if __name__ == "__main__":
    main()
