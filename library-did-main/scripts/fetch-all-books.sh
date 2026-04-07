#!/bin/bash
# 꿈샘 전체 소장 도서 CSV 추출 (AE117 API)
#
# Required:
# - ALPAS_API_URL (e.g. http://<host>:28180/BTLMS/HOMEPAGE/API)
# - ALPAS_MANAGE_CODE (e.g. CH)
# - ALPAS_NETWORK_ADAPTER_ID
#
# Optional:
# - SHELF_DATE_FROM (default: 2000/01/01)
# - SHELF_DATE_TO   (default: today, YYYY/MM/DD)
# - OUT             (default: books_YYYYMMDD.csv)

set -euo pipefail

ALPAS_API_URL="${ALPAS_API_URL:-}"
MANAGE_CODE="${ALPAS_MANAGE_CODE:-CH}"
NETWORK_ADAPTER_ID="${ALPAS_NETWORK_ADAPTER_ID:-}"
DATE_FROM="${SHELF_DATE_FROM:-2000/01/01}"
DATE_TO="${SHELF_DATE_TO:-$(date +%Y/%m/%d)}"

TODAY=$(date +%Y%m%d)
OUT="${OUT:-books_${TODAY}.csv}"

if [[ -z "$ALPAS_API_URL" ]]; then
  echo "ERROR: ALPAS_API_URL is required (e.g. http://<host>:28180/BTLMS/HOMEPAGE/API)" >&2
  exit 1
fi
if [[ -z "$NETWORK_ADAPTER_ID" ]]; then
  echo "ERROR: ALPAS_NETWORK_ADAPTER_ID is required" >&2
  exit 1
fi

BASE="${ALPAS_API_URL%/}/AE117.do"

echo "BOOK_KEY,REG_NO,TITLE,AUTHOR,PUBLISHER,PUBLISH_YEAR,EA_ISBN,CALL_NO,SHELF_LOC_CODE,SHELF_LOC_CODE_DESC,loan_able,WORKING_STATUS_DESC" > "$OUT"

echo "요청: manage_code=$MANAGE_CODE, date=$DATE_FROM~$DATE_TO"

TOTAL_PAGES="$(curl -s "${BASE}?manage_code=${MANAGE_CODE}&networkadapterid=${NETWORK_ADAPTER_ID}&shelf_date_from=${DATE_FROM}&shelf_date_to=${DATE_TO}&current_page=1&count_per_page=1000" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d.get('totalPage',1) or 1))")"
echo "총 페이지: $TOTAL_PAGES"

for page in $(seq 1 "$TOTAL_PAGES"); do
  echo -n "페이지 $page/$TOTAL_PAGES... "
  URL="${BASE}?manage_code=${MANAGE_CODE}&networkadapterid=${NETWORK_ADAPTER_ID}&shelf_date_from=${DATE_FROM}&shelf_date_to=${DATE_TO}&current_page=${page}&count_per_page=1000"
  curl -s "$URL" | python3 -c "
import sys,json,csv
d=json.load(sys.stdin)
w=csv.writer(sys.stdout,quoting=csv.QUOTE_ALL)
for b in d.get('searchList',d.get('searchlist',[])):
    w.writerow([b.get('BOOK_KEY',''),b.get('REG_NO',''),b.get('TITLE',''),b.get('AUTHOR',''),b.get('PUBLISHER',''),b.get('PUBLISH_YEAR',''),b.get('EA_ISBN',''),b.get('CALL_NO',''),b.get('SHELF_LOC_CODE',''),b.get('SHELF_LOC_CODE_DESC',''),b.get('loan_able',''),b.get('WORKING_STATUS_DESC','')])
" >> "$OUT"
  echo "완료"
  sleep 0.3
done

echo "저장: $OUT ($(wc -l < $OUT)행)"
