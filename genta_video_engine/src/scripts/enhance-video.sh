#!/bin/bash

# 비디오 개선 스크립트
# 1. 자막 추가 (하드코딩)
# 2. 마지막 씬에 책 제목/저자 표시

INPUT_VIDEO="output/final/final-video-24sec.mp4"
SUBTITLE_FILE="output/final/final-subtitle.vtt"
OUTPUT_VIDEO="output/final/어린왕자_24초_완성본.mp4"

echo "🎬 비디오 개선 시작..."
echo ""

# 1단계: 자막 추가
echo "📝 1단계: 자막 추가 중..."

ffmpeg -i "$INPUT_VIDEO" -vf "subtitles=$SUBTITLE_FILE:force_style='FontName=AppleGothic,FontSize=28,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BackColour=&H80000000&,Bold=1,Outline=2,Shadow=1,MarginV=40'" \
  -c:a copy \
  /tmp/video_with_subtitles.mp4 -y 2>&1 | tail -5

echo "✅ 자막 추가 완료"
echo ""

# 2단계: 책 제목 오버레이 추가 (20-24초 구간)
echo "📚 2단계: 책 제목 오버레이 추가 중..."

ffmpeg -i /tmp/video_with_subtitles.mp4 \
  -vf "drawtext=fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:text='어린 왕자':fontcolor=white:fontsize=80:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=(h-text_h)/2-60:enable='between(t,20,24)',\
       drawtext=fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:text='생텍쥐페리':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=(h-text_h)/2+40:enable='between(t,20,24)'" \
  -c:a copy \
  "$OUTPUT_VIDEO" -y 2>&1 | tail -5

echo "✅ 책 제목 오버레이 완료"
echo ""

# 임시 파일 삭제
rm -f /tmp/video_with_subtitles.mp4

echo "🎉 완성!"
echo "📺 최종 비디오: $OUTPUT_VIDEO"
echo ""
echo "재생: open $OUTPUT_VIDEO"
