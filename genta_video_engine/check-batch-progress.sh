#!/bin/bash

# 배치 생성 진행 상황 확인 스크립트

OUTPUT_FILE="/tmp/claude/-Users-jongwonlee-Documents-GenTA-bm-library--------trailer-engine/tasks/badeecf.output"

if [ ! -f "$OUTPUT_FILE" ]; then
    echo "❌ 출력 파일을 찾을 수 없습니다."
    echo "배치 작업이 아직 시작되지 않았거나 이미 완료되었습니다."
    exit 1
fi

echo "📊 배치 생성 진행 상황"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 현재 반복 횟수
CURRENT_ITERATION=$(grep -o "반복 [0-9]/5" "$OUTPUT_FILE" | tail -1)
echo "🎬 $CURRENT_ITERATION"

# 완료된 작업
COMPLETED=$(grep -c "✅" "$OUTPUT_FILE")
echo "✅ 완료된 작업: $COMPLETED"

# 비용 정보
TOTAL_COST=$(grep "총 비용:" "$OUTPUT_FILE" | tail -1)
if [ -n "$TOTAL_COST" ]; then
    echo "💰 $TOTAL_COST"
fi

# QC 점수
QC_SCORES=$(grep "QC 결과:" "$OUTPUT_FILE")
if [ -n "$QC_SCORES" ]; then
    echo ""
    echo "📈 QC 점수:"
    echo "$QC_SCORES" | while read line; do
        echo "   $line"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 실시간 로그 확인:"
echo "   tail -f \"$OUTPUT_FILE\""
echo ""
echo "📂 생성된 파일 확인:"
echo "   ls -lh output/batch/"
echo ""
